import { Capacitor } from "@capacitor/core";

import { AUTH_TOKEN_KEY } from "@/lib/auth/authConstants";

let tokenCache: string | null = null;
let hydrated = false;

function readLocalStorageToken(): string | null {
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

function writeLocalStorageToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (token === null || token.length === 0) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    } else {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Carrega el JWT des de Capacitor Preferences (natiu) o localStorage (web),
 * i el deixa a memòria per a `getStoredAuthTokenSync`.
 */
export async function hydrateAuthToken(): Promise<void> {
  if (typeof window === "undefined") {
    hydrated = true;
    return;
  }

  if (Capacitor.isNativePlatform()) {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: AUTH_TOKEN_KEY });
    const v = value?.trim() ?? "";
    tokenCache = v.length > 0 ? v : null;
    writeLocalStorageToken(tokenCache);
  } else {
    tokenCache = readLocalStorageToken();
  }
  hydrated = true;
}

/** Per a `apiFetch`: només lectura síncrona després d’hidratació. */
export function getStoredAuthTokenSync(): string | null {
  if (!hydrated && typeof window !== "undefined") {
    return readLocalStorageToken();
  }
  return tokenCache;
}

export async function persistAuthToken(token: string): Promise<void> {
  const t = token.trim();
  if (t.length === 0) {
    await clearPersistedAuthToken();
    return;
  }
  tokenCache = t;
  writeLocalStorageToken(t);
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: AUTH_TOKEN_KEY, value: t });
  }
}

export async function clearPersistedAuthToken(): Promise<void> {
  tokenCache = null;
  writeLocalStorageToken(null);
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key: AUTH_TOKEN_KEY });
  }
}
