import { useAuthContext } from "@/lib/auth/AuthProvider";
import type { AppAuthUser, AuthStatus } from "@/lib/auth/appAuthTypes";

/**
 * Substitució de `useSession` de next-auth: `data.user` manté una forma similar.
 */
export function useAuth(): {
  data: { user: AppAuthUser } | null;
  status: AuthStatus;
  refresh: (mode?: "initial" | "silent") => Promise<void>;
  patchUser: (partial: Partial<AppAuthUser>) => void;
  logout: () => Promise<void>;
  completeLoginWithToken: (token: string) => Promise<void>;
} {
  const ctx = useAuthContext();
  return {
    data: ctx.user === null ? null : { user: ctx.user },
    status: ctx.status,
    refresh: ctx.refresh,
    patchUser: ctx.patchUser,
    logout: ctx.logout,
    completeLoginWithToken: ctx.completeLoginWithToken,
  };
}
