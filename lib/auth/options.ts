import bcrypt from "bcryptjs";
import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { isReservezyRole } from "@/lib/session-role";
import { credentialsLoginSchema } from "@/schemas/credentials-login";

const SUPER_ADMIN_FIXED_ID = "reservezy_super_admin";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw): Promise<NextAuthUser | null> {
        const parsed = credentialsLoginSchema.safeParse({
          email: raw?.email,
          password: raw?.password,
        });

        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
        const superAdminPasswordHash =
          process.env.SUPER_ADMIN_PASSWORD_HASH?.trim();

        if (superAdminEmail && superAdminPasswordHash && email === superAdminEmail) {
          const matches = await bcrypt.compare(password, superAdminPasswordHash);
          if (!matches) {
            return null;
          }

          return {
            id: SUPER_ADMIN_FIXED_ID,
            email,
            name: "Platform admin",
            role: "SUPER_ADMIN",
          };
        }

        const owner = await prisma.owner.findUnique({
          where: { email },
          include: { ownedBusiness: true },
        });

        if (owner) {
          const ok = await bcrypt.compare(password, owner.passwordHash);
          if (!ok) {
            return null;
          }

          return {
            id: owner.id,
            email: owner.email,
            name: owner.fullName,
            role: "BUSINESS_OWNER",
            businessId: owner.ownedBusiness?.id ?? null,
            ownerId: owner.id,
            staffMemberId: null,
          };
        }

        const staffCandidates = await prisma.staffMember.findMany({
          where: { email, isActive: true, passwordHash: { not: null } },
          include: { business: true },
        });

        if (staffCandidates.length === 0) {
          return null;
        }

        if (staffCandidates.length > 1) {
          console.warn(
            `Multiple active staff members share ${email}; blocking ambiguous credentials login.`,
          );
          return null;
        }

        const staffMember = staffCandidates[0];
        const staffOk = staffMember.passwordHash
          ? await bcrypt.compare(password, staffMember.passwordHash)
          : false;

        if (!staffOk || staffMember.business.isDisabled) {
          return null;
        }

        return {
          id: staffMember.id,
          email: staffMember.email,
          name: staffMember.fullName,
          role: "STAFF",
          businessId: staffMember.business.id,
          ownerId: null,
          staffMemberId: staffMember.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.role && isReservezyRole(user.role)) {
        token.role = user.role;
        token.businessId = user.businessId ?? null;
        token.ownerId = user.ownerId ?? null;
        token.staffMemberId = user.staffMemberId ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (
        typeof token.sub !== "string" ||
        !token.role ||
        !isReservezyRole(token.role)
      ) {
        return session;
      }

      session.user = {
        ...session.user,
        id: token.sub,
        role: token.role,
        businessId: token.businessId ?? null,
        ownerId: token.ownerId ?? null,
        staffMemberId: token.staffMemberId ?? null,
      };

      return session;
    },
  },
};
