import { AUTH_TOKEN_COOKIE_NAME, verifyToken } from "@/lib/auth/jwt";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

function extractBearerToken(authorization: string | null): string | null {
  if (authorization === null || !authorization.startsWith("Bearer ")) {
    return null;
  }
  const t = authorization.slice("Bearer ".length).trim();
  return t.length > 0 ? t : null;
}

function extractCookieToken(cookieHeader: string | null): string | null {
  if (cookieHeader === null || cookieHeader.length === 0) {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name === AUTH_TOKEN_COOKIE_NAME && value.length > 0) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Bearer té prioritat (Capacitor); fallback cookie HttpOnly (web mateix origen).
 */
export async function resolveAuthUser(request: Request): Promise<AuthUser | null> {
  const bearer = extractBearerToken(request.headers.get("authorization"));
  const fromCookie = extractCookieToken(request.headers.get("cookie"));
  const token = bearer ?? fromCookie;
  if (token === null) {
    return null;
  }
  const payload = await verifyToken(token);
  if (payload === null) {
    return null;
  }
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}
