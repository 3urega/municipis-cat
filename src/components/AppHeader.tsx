"use client";

import type { Session } from "next-auth";
import Link from "next/link";
import { signOut } from "next-auth/react";

type AppHeaderProps = {
  user: NonNullable<Session["user"]>;
};

export function AppHeader({ user }: AppHeaderProps): React.ReactElement {
  return (
    <header className="absolute left-0 right-0 top-0 z-[1100] flex items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 py-2 text-sm shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/90">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="font-medium text-zinc-800 dark:text-zinc-100"
        >
          Catalunya Map
        </Link>
        <nav className="flex items-center gap-3 text-xs font-medium">
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
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {user.role === "superadmin" ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            superadmin
          </span>
        ) : null}
        <span className="max-w-[12rem] truncate text-zinc-600 dark:text-zinc-400">
          {user.name ?? user.email ?? user.id}
        </span>
        <button
          type="button"
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            void signOut({ callbackUrl: "/login" });
          }}
        >
          Tancar sessió
        </button>
      </div>
    </header>
  );
}
