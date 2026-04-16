"use client";

import { useAuth } from "@/hooks/useAuth";
import type { AppAuthUser } from "@/lib/auth/appAuthTypes";
import { formatBytesAsMiB } from "@/lib/usage/usageThresholds";
import Link from "next/link";
import { useEffect, useState } from "react";

type AppHeaderProps = {
  user: AppAuthUser;
};

function navLinkClassName(): string {
  return "block rounded-md px-3 py-2.5 text-base font-medium text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800";
}

function desktopNavLinkClassName(): string {
  return "text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100";
}

export function AppHeader({ user }: AppHeaderProps): React.ReactElement {
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const storageSummary =
    !user.isStorageUnlimited ? (
      <p className="text-sm leading-snug text-zinc-600 dark:text-zinc-400">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Emmagatzematge:{" "}
        </span>
        {formatBytesAsMiB(BigInt(user.storageUsed))}/
        {formatBytesAsMiB(user.storageLimitBytes)} MiB
        {user.municipalitiesLimit !== null ? (
          <>
            <br />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Municipis:{" "}
            </span>
            {String(user.municipalitiesUsedCount)}/
            {String(user.municipalitiesLimit)}
          </>
        ) : user.plan === "PREMIUM" ? (
          <>
            <br />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Municipis:{" "}
            </span>
            {String(user.municipalitiesUsedCount)}
          </>
        ) : null}
        {user.plan === "PREMIUM" ? (
          <>
            <br />
            <span className="text-emerald-700 dark:text-emerald-400">Pla Premium</span>
          </>
        ) : null}
      </p>
    ) : null;

  return (
    <>
      <header
        className={`absolute left-[env(safe-area-inset-left,0px)] right-[env(safe-area-inset-right,0px)] top-[env(safe-area-inset-top,0px)] flex max-w-full min-w-0 items-center justify-between gap-2 overflow-x-hidden border-b border-zinc-200/80 bg-white/90 px-3 py-2 text-sm shadow-sm backdrop-blur sm:gap-3 sm:px-4 dark:border-zinc-800/80 dark:bg-zinc-950/90 ${
          menuOpen ? "z-[1160]" : "z-[1100]"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-zinc-800 hover:bg-zinc-100 md:hidden dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Obrir menú de navegació"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => {
              setMenuOpen((o) => !o);
            }}
          >
            {menuOpen ? (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <Link
            href="/"
            className="min-w-0 flex-1 truncate font-medium text-zinc-800 dark:text-zinc-100 sm:max-w-none sm:flex-none sm:text-sm"
            onClick={() => {
              setMenuOpen(false);
            }}
          >
            Catalunya Map
          </Link>
          <nav
            className="hidden min-w-0 shrink items-center gap-2 text-xs font-medium md:flex md:gap-3"
            aria-label="Navegació principal"
          >
            <Link
              href="/explorer"
              className={desktopNavLinkClassName()}
            >
              Explorador
            </Link>
            <Link href="/" className={desktopNavLinkClassName()}>
              Mapa
            </Link>
            <Link href="/about" className={desktopNavLinkClassName()}>
              Sobre l&apos;app
            </Link>
          </nav>
        </div>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-3">
          {user.role === "superadmin" ? (
            <span className="hidden rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 md:inline dark:bg-amber-900/40 dark:text-amber-200">
              superadmin
            </span>
          ) : null}
          {!user.isStorageUnlimited ? (
            <span
              className="hidden max-w-[14rem] truncate text-xs text-zinc-500 md:inline lg:max-w-none dark:text-zinc-500"
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
          <span className="hidden max-w-[12rem] truncate text-xs text-zinc-600 md:inline dark:text-zinc-400">
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
            <span className="md:hidden">Sortir</span>
            <span className="hidden md:inline">Tancar sessió</span>
          </button>
        </div>
      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[1140] cursor-default bg-black/40"
            aria-label="Tancar menú"
            onClick={() => {
              setMenuOpen(false);
            }}
          />
          <div
            id="mobile-nav-drawer"
            className="fixed bottom-0 left-0 top-[calc(3rem+env(safe-area-inset-top,0px))] z-[1151] flex w-[min(100%,20rem)] flex-col border-r border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegació"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Menú
              </span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Tancar menú"
                onClick={() => {
                  setMenuOpen(false);
                }}
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav
              className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
              aria-label="Navegació"
            >
              <Link
                href="/explorer"
                className={navLinkClassName()}
                onClick={() => {
                  setMenuOpen(false);
                }}
              >
                Explorador
              </Link>
              <Link
                href="/"
                className={navLinkClassName()}
                onClick={() => {
                  setMenuOpen(false);
                }}
              >
                Mapa
              </Link>
              <Link
                href="/about"
                className={navLinkClassName()}
                onClick={() => {
                  setMenuOpen(false);
                }}
              >
                Sobre l&apos;app
              </Link>
            </nav>
            <div className="border-t border-zinc-200 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] dark:border-zinc-800">
              <p className="mb-2 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {user.name ?? user.email ?? user.id}
              </p>
              {user.role === "superadmin" ? (
                <span className="mb-3 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                  superadmin
                </span>
              ) : null}
              {storageSummary !== null ? (
                <div className="mb-4">{storageSummary}</div>
              ) : null}
              <button
                type="button"
                className="w-full rounded-md border border-zinc-300 bg-zinc-50 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => {
                  void logout().then(() => {
                    setMenuOpen(false);
                    if (typeof window !== "undefined") {
                      window.location.href = "/login";
                    }
                  });
                }}
              >
                Tancar sessió
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
