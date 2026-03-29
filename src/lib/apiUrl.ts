import { AUTH_TOKEN_KEY } from "@/lib/auth/authConstants";

function isLocalDevBrowserOrigin(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
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

/** JWT a localStorage (Capacitor / origen diferent); la cookie HttpOnly cobreix la web mateix origen. */
export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const t = window.localStorage.getItem(AUTH_TOKEN_KEY)?.trim();
    return t !== undefined && t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearStoredAuthToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Fetch a l’API: mateix origen usa cookie; Capacitor afegeix `Authorization: Bearer` des de localStorage.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  const crossOrigin = getApiBaseUrl().length > 0;
  const headers = new Headers(init?.headers);
  if (crossOrigin) {
    const token = getStoredAuthToken();
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
