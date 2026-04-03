import { getStoredAuthTokenSync } from "@/lib/auth/authTokenStore";

function isLocalDevBrowserOrigin(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  const h = window.location.hostname;
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "[::1]" ||
    h === "::1"
  );
}

/**
 * Base URL del backend (Next `next start`). Buit en desenvolupament web típic
 * (mateix origen que la UI); obligatori en build Capacitor (`out/`).
 *
 * A `next dev` des de localhost, s’ignora NEXT_PUBLIC_API_URL al navegador perquè
 * les crides vagin al mateix servidor (evita POST a Railway amb origen local → 400).
 */
export function getApiBaseUrl(): string {
  if (isLocalDevBrowserOrigin()) {
    return "";
  }
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  return raw.replace(/\/$/, "");
}

/**
 * Resol paths d’API i uploads relatius (`/api/...`) cap a URL absoluta quan cal.
 */
export function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (base.length === 0) {
    return normalized;
  }
  return `${base}${normalized}`;
}

/** JWT després d’`hydrateAuthToken()` (Preferences / localStorage). */
export function getStoredAuthToken(): string | null {
  return getStoredAuthTokenSync();
}

/**
 * Fetch a l’API: mateix origen usa cookie; Capacitor afegeix `Authorization: Bearer` des del magatzem.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  const crossOrigin = getApiBaseUrl().length > 0;
  const headers = new Headers(init?.headers);
  if (crossOrigin) {
    const token = getStoredAuthTokenSync();
    if (token !== null) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: crossOrigin
      ? "include"
      : (init?.credentials ?? "same-origin"),
  });
}
