"use client";

import { useAuth } from "@/hooks/useAuth";
import type { AppAuthUser } from "@/lib/auth/appAuthTypes";
import { formatBytesAsMiB } from "@/lib/usage/usageThresholds";
import Link from "next/link";

type AppHeaderProps = {
  user: AppAuthUser;
};

export function AppHeader({ user }: AppHeaderProps): React.ReactElement {
  const { logout } = useAuth();
  return (
    <header className="absolute left-[env(safe-area-inset-left,0px)] right-[env(safe-area-inset-right,0px)] top-[env(safe-area-inset-top,0px)] z-[1100] flex max-w-full min-w-0 items-center justify-between gap-2 overflow-x-hidden border-b border-zinc-200/80 bg-white/90 px-3 py-2 text-sm shadow-sm backdrop-blur sm:gap-3 sm:px-4 dark:border-zinc-800/80 dark:bg-zinc-950/90">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <Link
          href="/"
          className="shrink-0 truncate font-medium text-zinc-800 dark:text-zinc-100 max-sm:max-w-[9rem] max-sm:text-xs sm:max-w-none sm:text-sm"
        >
          Catalunya Map
        </Link>
        <nav className="flex min-w-0 shrink items-center gap-2 text-[11px] font-medium sm:gap-3 sm:text-xs">
          <Link
            href="/explorer"
            className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Explorador
          </Link>
          <Link
            href="/"
            className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Mapa
          </Link>
          <Link
            href="/about"
            className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Sobre l&apos;app
          </Link>
        </nav>
      </div>
      <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-3">
        {user.role === "superadmin" ? (
          <span className="hidden rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 sm:inline dark:bg-amber-900/40 dark:text-amber-200">
            superadmin
          </span>
        ) : null}
        {!user.isStorageUnlimited ? (
          <span
            className="max-w-[10rem] truncate text-[10px] text-zinc-500 min-[420px]:max-w-[14rem] sm:max-w-none dark:text-zinc-500"
            title="Ús d’emmagatzematge al servidor"
          >
            {formatBytesAsMiB(BigInt(user.storageUsed))}/
            {formatBytesAsMiB(user.storageLimitBytes)} MiB
            {user.municipalitiesLimit !== null ? (
              <>
                {" "}
                · {String(user.municipalitiesUsedCount)}/
                {String(user.municipalitiesLimit)} mun.
              </>
            ) : user.plan === "PREMIUM" ? (
              <> · {String(user.municipalitiesUsedCount)} mun.</>
            ) : null}
            {user.plan === "PREMIUM" ? " · Prem." : ""}
          </span>
        ) : null}
        <span className="hidden max-w-[10rem] truncate text-xs text-zinc-600 min-[380px]:block sm:max-w-[12rem] dark:text-zinc-400">
          {user.name ?? user.email ?? user.id}
        </span>
        <button
          type="button"
          className="shrink-0 rounded-md border border-zinc-300 px-1.5 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-100 sm:px-2 sm:text-xs dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            void logout().then(() => {
              if (typeof window !== "undefined") {
                window.location.href = "/login";
              }
            });
          }}
        >
          <span className="sm:hidden">Sortir</span>
          <span className="hidden sm:inline">Tancar sessió</span>
        </button>
      </div>
    </header>
  );
}
