import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Heslo", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          organisationId: user.organisationId,
          role: user.role,
          registrationNumber: user.registrationNumber ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    authorized: async ({ auth: session, request }) => {
      const isLoggedIn = !!session?.user;
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/manifest") ||
        pathname.startsWith("/icons") ||
        pathname === "/sw.js";
      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.organisationId = (user as { organisationId: string }).organisationId;
        token.role = (user as { role: string }).role;
        token.registrationNumber = (user as { registrationNumber?: string }).registrationNumber;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.organisationId = token.organisationId as string;
        session.user.role = token.role as string;
        session.user.registrationNumber = token.registrationNumber as string | undefined;
      }
      return session;
    },
  },
});
