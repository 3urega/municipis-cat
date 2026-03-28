import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import { DEV_SUPERADMIN_EMAIL } from "@/lib/devAuth";
import { isCredentialsLoginEnabled } from "@/lib/isCredentialsLoginEnabled";
import { isGitHubOAuthConfigured } from "@/lib/isGitHubOAuthConfigured";
import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";

const prisma = getOrCreatePrismaClient();

/**
 * App Capacitor: la UI és `capacitor://localhost` (o `https://localhost`) i l’API és un altre origen (Railway).
 * Amb SameSite=Lax el navegador/WebView no envia les cookies en fetch cross-origin amb credentials,
 * i la sessió sembla “trencada” després del login.
 * Activa-ho només al backend HTTPS (Railway), p. ex. AUTH_CROSS_SITE_COOKIES=true.
 */
const crossSiteSessionCookies =
  process.env.AUTH_CROSS_SITE_COOKIES === "true";

const sameSiteNoneSecure = {
  sameSite: "none" as const,
  secure: true,
};

/** Estratègia JWT: necessària perquè Credentials obre sessió amb JWT; amb `database` el token no coincideix amb `sessions`. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function buildCredentialsProvider(): ReturnType<typeof Credentials> {
  return Credentials({
    id: "dev-credentials",
    name: "Entorn de desenvolupament",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Contrasenya", type: "password" },
    },
    async authorize(credentials) {
      if (
        credentials?.email === undefined ||
        credentials?.password === undefined ||
        typeof credentials.email !== "string" ||
        typeof credentials.password !== "string"
      ) {
        return null;
      }
      const email = credentials.email.trim().toLowerCase();
      const password = credentials.password.trim();
      if (email !== DEV_SUPERADMIN_EMAIL) {
        return null;
      }
      const user = await prisma.user.findUnique({
        where: { email: DEV_SUPERADMIN_EMAIL },
      });
      if (
        user === null ||
        user.passwordHash === null ||
        user.passwordHash.length === 0
      ) {
        return null;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return null;
      }
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  });
}

const authProviders = [
  ...(isCredentialsLoginEnabled() ? [buildCredentialsProvider()] : []),
  ...(isGitHubOAuthConfigured() ? [GitHub] : []),
];

const trimmedAuthSecret = process.env.AUTH_SECRET?.trim() ?? "";
const authSecret: string | undefined =
  trimmedAuthSecret.length > 0
    ? trimmedAuthSecret
    : process.env.NODE_ENV === "development"
      ? "dev-auth-secret-canvia-en-produccio"
      : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: authSecret,
  providers: authProviders,
  ...(crossSiteSessionCookies
    ? {
        cookies: {
          sessionToken: { options: sameSiteNoneSecure },
          callbackUrl: { options: sameSiteNoneSecure },
          csrfToken: { options: sameSiteNoneSecure },
          pkceCodeVerifier: { options: sameSiteNoneSecure },
          state: { options: sameSiteNoneSecure },
          nonce: { options: sameSiteNoneSecure },
          webauthnChallenge: { options: sameSiteNoneSecure },
        },
      }
    : {}),
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({
      session,
      user,
      token,
    }: {
      session: Session;
      user?: User;
      token: JWT;
    }) {
      const userId =
        typeof user?.id === "string" && user.id.length > 0
          ? user.id
          : typeof token.sub === "string" && token.sub.length > 0
            ? token.sub
            : undefined;

      if (userId === undefined) {
        return session;
      }

      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const role = row?.role ?? "user";

      session.user = {
        ...session.user,
        id: userId,
        role,
      };

      return session;
    },
  },
  trustHost: true,
});
