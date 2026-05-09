import type { DefaultSession } from "next-auth";

import type { ReservezyRole } from "@/lib/session-role";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: ReservezyRole;
      businessId?: string | null;
      ownerId?: string | null;
      staffMemberId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: ReservezyRole;
    businessId?: string | null;
    ownerId?: string | null;
    staffMemberId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: ReservezyRole;
    businessId?: string | null;
    ownerId?: string | null;
    staffMemberId?: string | null;
  }
}
