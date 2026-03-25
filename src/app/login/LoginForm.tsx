"use client";

import { DEV_SUPERADMIN_EMAIL } from "@/lib/devAuth";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const isDevRuntime = process.env.NODE_ENV === "development";

type LoginFormProps = {
  githubConfigured: boolean;
};

export function LoginForm({ githubConfigured }: LoginFormProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [devPassword, setDevPassword] = useState("");
  const [devSubmitting, setDevSubmitting] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Iniciar sessió
        </h1>
        {githubConfigured ? (
          <>
            <p className="max-w-sm text-center text-sm text-zinc-600 dark:text-zinc-400">
              Accés amb compte de GitHub.
            </p>
            <button
              type="button"
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              onClick={() => {
                void signIn("github", { callbackUrl }).catch(() => {
                  setError(
                    "No s’ha pogut iniciar sessió amb GitHub.",
                  );
                });
              }}
            >
              Continuar amb GitHub
            </button>
          </>
        ) : (
          <>
            <p className="max-w-sm text-center text-sm text-zinc-600 dark:text-zinc-400">
              L’accés amb GitHub no està configurat. Defineix{" "}
              <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
                AUTH_GITHUB_ID
              </code>{" "}
              i{" "}
              <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
                AUTH_GITHUB_SECRET
              </code>{" "}
              (vegeu{" "}
              <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
                .env.example
              </code>
              ).
            </p>
            {isDevRuntime ? (
              <p className="max-w-sm text-center text-xs text-amber-800 dark:text-amber-200/90">
                En desenvolupament pots usar «Entra com a dev» a sota.
              </p>
            ) : null}
          </>
        )}
        {error !== null ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      {isDevRuntime ? (
        <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Entra com a dev
          </h2>
          <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
            Només disponible amb{" "}
            <code className="rounded bg-amber-100 px-0.5 dark:bg-amber-900/60">
              NODE_ENV=development
            </code>
            . Usuari sembrat amb{" "}
            <code className="break-all rounded bg-amber-100 px-0.5 dark:bg-amber-900/60">
              npm run db:seed
            </code>
            .
          </p>
          <p className="mt-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
            {DEV_SUPERADMIN_EMAIL}
          </p>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setDevSubmitting(true);
              void signIn("dev-credentials", {
                email: DEV_SUPERADMIN_EMAIL,
                password: devPassword,
                redirect: false,
              })
                .then((res) => {
                  if (res === undefined) {
                    setError("Resposta invàlida del servidor d’autenticació.");
                    return;
                  }
                  if (res.error !== null && res.error !== undefined) {
                    setError("Contrasenya incorrecta o usuari no sembrat (executa npm run db:seed).");
                    return;
                  }
                  if (res.ok) {
                    router.push(callbackUrl);
                    router.refresh();
                  }
                })
                .catch(() => {
                  setError("No s’ha pogut iniciar sessió com a dev.");
                })
                .finally(() => {
                  setDevSubmitting(false);
                });
            }}
          >
            <label className="flex flex-col gap-1 text-xs text-zinc-700 dark:text-zinc-300">
              Contrasenya
              <input
                type="password"
                autoComplete="current-password"
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                value={devPassword}
                onChange={(ev) => {
                  setDevPassword(ev.target.value);
                }}
              />
            </label>
            <button
              type="submit"
              disabled={devSubmitting}
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {devSubmitting ? "Entrant…" : "Entra com a dev"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
