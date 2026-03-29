import { SignJWT, jwtVerify } from "jose";

import { AUTH_TOKEN_KEY } from "@/lib/auth/authConstants";

const ALG = "HS256";

/** 30 dies (coincidia amb l'antiga sessió NextAuth). */
const TOKEN_MAX_AGE = "30d";

export const AUTH_TOKEN_COOKIE_NAME = AUTH_TOKEN_KEY;

export type AppJwtPayload = {
  sub: string;
  email: string;
  role: string;
};

function getSecretKey(): Uint8Array {
  const trimmed = process.env.AUTH_SECRET?.trim() ?? "";
  if (trimmed.length === 0) {
    if (process.env.NODE_ENV === "development") {
      return new TextEncoder().encode("dev-auth-secret-canvia-en-produccio");
    }
    throw new Error("AUTH_SECRET is required in production");
  }
  return new TextEncoder().encode(trimmed);
}

export async function signToken(payload: AppJwtPayload): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(TOKEN_MAX_AGE)
    .sign(key);
}

export async function verifyToken(token: string): Promise<AppJwtPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, { algorithms: [ALG] });
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    if (sub.length === 0 || email.length === 0) {
      return null;
    }
    return {
      sub,
      email,
      role: role.length > 0 ? role : "user",
    };
  } catch {
    return null;
  }
}
