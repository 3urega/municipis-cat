"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { AppAuthUser, AuthStatus } from "@/lib/auth/appAuthTypes";
import {
  clearPersistedAuthToken,
  hydrateAuthToken,
  persistAuthToken,
} from "@/lib/auth/authTokenStore";
import { apiFetch } from "@/lib/apiUrl";
import { restorePremiumAfterLogin } from "@/lib/billing/googlePlayPremium";

type LoadMode = "initial" | "silent";

type AuthContextValue = {
  user: AppAuthUser | null;
  status: AuthStatus;
  /** Després de login: persisteix el JWT (Preferences / localStorage) i recarrega `/api/auth/me`. */
  completeLoginWithToken: (token: string) => Promise<void>;
  refresh: (mode?: LoadMode) => Promise<void>;
  /** Actualització puntual del perfil (p. ex. després d’una recompensa AdMob sense esperar `/api/auth/me`). */
  patchUser: (partial: Partial<AppAuthUser>) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const loadMe = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setStatus("loading");
    }
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.status === 401) {
        await clearPersistedAuthToken();
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      if (!res.ok) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      const data = (await res.json()) as { user: AppAuthUser };
      setUser(data.user);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void (async (): Promise<void> => {
      await hydrateAuthToken();
      await loadMe("initial");
    })();
  }, [loadMe]);

  useEffect(() => {
    const id = user?.id;
    if (status !== "authenticated" || id === undefined || id.length === 0) {
      return;
    }
    void (async (): Promise<void> => {
      try {
        const updated = await restorePremiumAfterLogin(id);
        if (updated) {
          await loadMe("silent");
        }
      } catch {
        /* Play no disponible o sense compres */
      }
    })();
  }, [status, user?.id, loadMe]);

  const completeLoginWithToken = useCallback(
    async (token: string) => {
      await persistAuthToken(token);
      await loadMe("silent");
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    await clearPersistedAuthToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const patchUser = useCallback((partial: Partial<AppAuthUser>) => {
    setUser((prev) => (prev === null ? null : { ...prev, ...partial }));
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      completeLoginWithToken,
      refresh: loadMe,
      patchUser,
      logout,
    }),
    [user, status, completeLoginWithToken, loadMe, patchUser, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return ctx;
}
