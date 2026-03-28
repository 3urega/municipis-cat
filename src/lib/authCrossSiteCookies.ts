/**
 * Cookies Auth SameSite=None + Secure: necessàries per Capacitor/WebView
 * quan la UI és un altre origen que l’API (HTTPS).
 *
 * NO activar sobre authUrl http://localhost* (Docker local) per evitar CSRF trencat.
 * En Railway/Vercel el client arriba per HTTPS encara que AUTH_URL sigui mal configurat com http://.
 */

function isLocalHttpUrl(raw: string): boolean {
  const t = raw.trim();
  if (t.length === 0) return false;
  try {
    const u = new URL(t);
    return (
      u.protocol === "http:" &&
      (u.hostname === "localhost" ||
        u.hostname === "127.0.0.1" ||
        u.hostname === "[::1]")
    );
  } catch {
    return false;
  }
}

function isHttpsUrl(raw: string): boolean {
  const t = raw.trim();
  if (t.length === 0) return false;
  try {
    return new URL(t).protocol === "https:";
  } catch {
    return false;
  }
}

/** Mateixa decisió que NextAuth `cookies` cross-site i el log d’instrumentation. */
export function useAuthCrossSiteSessionCookies(): boolean {
  if (process.env.AUTH_CROSS_SITE_COOKIES !== "true") {
    return false;
  }

  const authUrl = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").trim();
  const publicApi = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

  const onManagedHost =
    process.env.RAILWAY_ENVIRONMENT !== undefined ||
    process.env.VERCEL === "1";

  if (onManagedHost) {
    if (isLocalHttpUrl(authUrl)) {
      return false;
    }
    return true;
  }

  if (isLocalHttpUrl(authUrl) || isLocalHttpUrl(publicApi)) {
    return false;
  }

  if (isHttpsUrl(authUrl) || isHttpsUrl(publicApi)) {
    return true;
  }

  return process.env.AUTH_ASSUME_PUBLIC_HTTPS === "true";
}
