/**
 * Base URL del backend (Next `next start`). Buit en desenvolupament web típic
 * (mateix origen que la UI); obligatori en build Capacitor (`out/`).
 */
export function getApiBaseUrl(): string {
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

/** Fetch a l’API amb cookies quan el front i el backend són origen diferent (Capacitor). */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  const crossOrigin = getApiBaseUrl().length > 0;
  return fetch(url, {
    ...init,
    credentials: crossOrigin
      ? "include"
      : (init?.credentials ?? "same-origin"),
  });
}
