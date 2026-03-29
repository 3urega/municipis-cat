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

type LoadMode = "initial" | "silent";

type AuthContextValue = {
  user: AppAuthUser | null;
  status: AuthStatus;
  /** Després de login: persisteix el JWT (Preferences / localStorage) i recarrega `/api/auth/me`. */
  completeLoginWithToken: (token: string) => Promise<void>;
  refresh: (mode?: LoadMode) => Promise<void>;
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

  const value = useMemo(
    () => ({
      user,
      status,
      completeLoginWithToken,
      refresh: loadMe,
      logout,
    }),
    [user, status, completeLoginWithToken, loadMe, logout],
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
