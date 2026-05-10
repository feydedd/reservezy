import bcrypt from "bcryptjs";
import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";

import { prisma } from "@/lib/prisma";
import { isReservezyRole } from "@/lib/session-role";
import { credentialsLoginSchema } from "@/schemas/credentials-login";

const SUPER_ADMIN_FIXED_ID = "reservezy_super_admin";

const oauthProviders = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
  ...(process.env.APPLE_ID && process.env.APPLE_SECRET
    ? [
        AppleProvider({
          clientId: process.env.APPLE_ID,
          clientSecret: process.env.APPLE_SECRET,
        }),
      ]
    : []),
];

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...oauthProviders,
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
          // OAuth-only account — no password set
          if (!owner.passwordHash) return null;
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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "apple") {
        const email = (
          (profile as { email?: string } | undefined)?.email ?? user.email
        )
          ?.trim()
          .toLowerCase();
        if (!email) return false;

        const existing = await prisma.owner.findUnique({ where: { email } });

        if (existing) {
          if (account.provider === "google") {
            if (existing.googleId && existing.googleId !== account.providerAccountId) {
              return "/login?error=OAuthAccountNotLinked";
            }
            if (!existing.googleId) {
              await prisma.owner.update({
                where: { id: existing.id },
                data: { googleId: account.providerAccountId },
              });
            }
          } else {
            if (existing.appleId && existing.appleId !== account.providerAccountId) {
              return "/login?error=OAuthAccountNotLinked";
            }
            if (!existing.appleId) {
              await prisma.owner.update({
                where: { id: existing.id },
                data: { appleId: account.providerAccountId },
              });
            }
          }
        } else {
          // New OAuth user — create a stub owner (no business yet)
          const fullName = String(
            (profile as { name?: string } | undefined)?.name ?? user.name ?? "",
          );
          await prisma.owner.create({
            data: {
              email,
              fullName,
              emailVerified: true,
              ...(account.provider === "google"
                ? { googleId: account.providerAccountId }
                : { appleId: account.providerAccountId }),
            },
          });
        }

        return true;
      }

      return true;
    },

    async jwt({ token, user, account, profile }) {
      // OAuth first sign-in — resolve owner row from DB to populate custom claims
      if (account?.provider === "google" || account?.provider === "apple") {
        const email = (
          (profile as { email?: string } | undefined)?.email ?? user?.email
        )
          ?.trim()
          .toLowerCase();
        if (email) {
          const owner = await prisma.owner.findUnique({
            where: { email },
            include: { ownedBusiness: true },
          });
          if (owner) {
            token.sub = owner.id;
            token.role = "BUSINESS_OWNER";
            token.businessId = owner.ownedBusiness?.id ?? null;
            token.ownerId = owner.id;
            token.staffMemberId = null;
          }
        }
        return token;
      }

      // Credentials provider — user object carries our custom fields
      if (user && "role" in user && user.role && isReservezyRole(user.role)) {
        token.role = user.role;
        token.businessId = (user as NextAuthUser).businessId ?? null;
        token.ownerId = (user as NextAuthUser).ownerId ?? null;
        token.staffMemberId = (user as NextAuthUser).staffMemberId ?? null;
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
