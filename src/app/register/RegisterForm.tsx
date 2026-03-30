"use client";

import { AuthScreenBackdrop } from "@/components/auth/AuthScreenBackdrop";
import { apiFetch } from "@/lib/apiUrl";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/registerValidation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type RegisterFormProps = {
  registrationUiShown: boolean;
};

export function RegisterForm({
  registrationUiShown,
}: RegisterFormProps): React.ReactElement {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const loginHref = `/login?${new URLSearchParams({ callbackUrl }).toString()}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!registrationUiShown) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 pb-12 pt-[calc(3rem+env(safe-area-inset-top,0px))]">
        <AuthScreenBackdrop />
        <h1 className="relative z-10 text-2xl font-semibold text-white drop-shadow-md">
          Registre no disponible
        </h1>
        <p className="relative z-10 max-w-sm text-center text-sm text-zinc-200/95 drop-shadow-sm">
          En aquest entorn no s&apos;ha activat la creació de comptes al client.
        </p>
        <Link
          href={loginHref}
          className="relative z-10 text-sm font-medium text-sky-300 hover:text-sky-200"
        >
          Tornar a iniciar sessió
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 pb-12 pt-[calc(3rem+env(safe-area-inset-top,0px))]">
      <AuthScreenBackdrop />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold text-white drop-shadow-md">
          Crear compte
        </h1>
        <p className="max-w-sm text-center text-sm text-zinc-200/95 drop-shadow-sm">
          Contrasenya mínima {String(PASSWORD_MIN_LENGTH)} caràcters. Després
          podràs iniciar sessió amb el mateix correu.
        </p>
        {error !== null ? (
          <p className="max-w-sm text-center text-sm font-medium text-red-200 drop-shadow">
            {error}
          </p>
        ) : null}
        {success !== null ? (
          <p className="text-sm font-medium text-emerald-200 drop-shadow">
            {success}
          </p>
        ) : null}
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setSuccess(null);
            setSubmitting(true);
            void (async () => {
              try {
                const res = await apiFetch("/api/auth/register", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, password }),
                });
                const raw = await res.text();
                let data: { error?: string } = {};
                try {
                  data = JSON.parse(raw) as { error?: string };
                } catch {
                  /* empty */
                }
                if (!res.ok) {
                  setError(
                    typeof data.error === "string" && data.error.length > 0
                      ? data.error
                      : `Error HTTP ${String(res.status)}`,
                  );
                  return;
                }
                setSuccess(
                  "Compte creat. Ja pots iniciar sessió amb aquest correu.",
                );
                setPassword("");
              } catch {
                setError("No s’ha pogut contactar amb el servidor de registre.");
              } finally {
                setSubmitting(false);
              }
            })();
          }}
        >
          <label className="flex flex-col gap-1 text-xs text-zinc-700 dark:text-zinc-300">
            Correu
            <input
              type="email"
              autoComplete="email"
              required
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={email}
              onChange={(ev) => {
                setEmail(ev.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-700 dark:text-zinc-300">
            Contrasenya
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={password}
              onChange={(ev) => {
                setPassword(ev.target.value);
              }}
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? "Registrant…" : "Registrar-se"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Ja tens compte?{" "}
          <Link
            href={loginHref}
            className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Inicia sessió
          </Link>
        </p>
      </div>
    </div>
  );
}
