import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organisationId: string;
      role: string;
      registrationNumber?: string;
    } & DefaultSession["user"];
  }

  interface User {
    organisationId: string;
    role: string;
    registrationNumber?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organisationId?: string;
    role?: string;
    registrationNumber?: string;
  }
}
