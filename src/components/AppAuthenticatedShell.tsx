"use client";

import { useAuth } from "@/hooks/useAuth";
import type { AppAuthUser } from "@/lib/auth/appAuthTypes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppHeader } from "@/components/AppHeader";

type AppAuthenticatedShellProps = {
  children: React.ReactNode;
};

function isValidUser(
  user: AppAuthUser | undefined,
): user is AppAuthUser {
  return (
    user !== undefined &&
    typeof user.id === "string" &&
    user.id.length > 0
  );
}

export function AppAuthenticatedShell({
  children,
}: AppAuthenticatedShellProps): React.ReactElement {
  const { data: session, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "unauthenticated") {
      return;
    }
    const callbackUrl =
      pathname + (typeof window !== "undefined" ? window.location.search : "");
    const loginUrl =
      callbackUrl.length > 0
        ? `/login?${new URLSearchParams({ callbackUrl }).toString()}`
        : "/login";
    router.replace(loginUrl);
  }, [status, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-600 dark:bg-zinc-950">
        Carregant sessió…
      </div>
    );
  }

  if (status === "unauthenticated" || !isValidUser(session?.user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-600 dark:bg-zinc-950">
        Redirigint a inici de sessió…
      </div>
    );
  }

  return (
    <>
      <AppHeader user={session.user} />
      <div className="min-h-screen pt-[calc(3rem+env(safe-area-inset-top,0px))]">
        {children}
      </div>
    </>
  );
}
