"use client";

import { AuthScreenBackdrop } from "@/components/auth/AuthScreenBackdrop";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, apiUrl, getApiBaseUrl } from "@/lib/apiUrl";
import { getPrivacyPolicyUrl } from "@/lib/privacyPolicyUrl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type LoginFormProps = {
  credentialsLoginEnabled: boolean;
  registrationUiShown: boolean;
};

function messageForLoginFailure(
  status: number,
  apiError: string | undefined,
): string {
  const e = apiError?.trim() ?? "";
  const backendHint =
    getApiBaseUrl().length > 0
      ? ` URL d’API configurada: ${apiUrl("/api/auth/login")}.`
      : " En web local, això hauria d’anar a http://localhost:3000/api/auth/login (mateix servidor que `next dev`).";

  if (e === "Credentials login is not enabled on this server") {
    return "Aquest servidor no té activat el login per contrasenya. Cal AUTH_ALLOW_CREDENTIALS=true al backend.";
  }
  if (
    e === "Invalid email or password" ||
    status === 401
  ) {
    return "Correu o contrasenya incorrectes.";
  }
  if (e.length > 0) {
    return e;
  }
  if (status >= 500) {
    return `Error del servidor (HTTP ${String(status)}). Comprova logs del backend i que NEXT_PUBLIC_API_URL (Capacitor) apunta al Node que executa Next, no només a fitxers estàtics.${backendHint}`;
  }
  if (status === 404) {
    return `No s’ha trobat l’endpoint de login (HTTP 404).${backendHint} Assegura’t que el desplegament és \`next start\` (o equivalent) amb les rutes sota /api/, no un export estàtic sense API.`;
  }
  if (status === 403) {
    return `Accés denegat (HTTP 403) sense detall JSON.${backendHint} Pot ser proxy, WAF o que el servidor retorni una pàgina HTML en lloc de l’API.`;
  }
  if (status === 405) {
    return `Mètode no permès (HTTP 405) a l’URL de login.${backendHint}`;
  }
  return `No s’ha pogut iniciar sessió (HTTP ${String(status)}). Resposta sense camp «error» (sovint HTML d’un proxy o URL incorrecta).${backendHint}`;
}

export function LoginForm({
  credentialsLoginEnabled,
  registrationUiShown,
}: LoginFormProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const { completeLoginWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const registerHref = `/register?${new URLSearchParams({ callbackUrl }).toString()}`;
  const privacyPolicyUrl = getPrivacyPolicyUrl();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 pb-12 pt-[calc(3rem+env(safe-area-inset-top,0px))]">
      <AuthScreenBackdrop />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold text-white drop-shadow-md">
          Iniciar sessió
        </h1>
        {credentialsLoginEnabled ? (
          <p className="max-w-sm text-center text-sm text-zinc-200/95 drop-shadow-sm">
            Correu i contrasenya. A l’app Android el token es desa de forma segura i la sessió es manté
            (fins a 30 dies). Al web amb el mateix domini que l’API també s’usa una cookie. Variables:
            backend{" "}
            <code className="rounded border border-white/15 bg-black/25 px-1 py-0.5 text-xs text-zinc-100">
              AUTH_ALLOW_CREDENTIALS=true
            </code>
            ; build Capacitor{" "}
            <code className="rounded border border-white/15 bg-black/25 px-1 py-0.5 text-xs text-zinc-100">
              NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS=true
            </code>
            .
          </p>
        ) : (
          <p className="max-w-sm text-center text-sm text-zinc-200/95 drop-shadow-sm">
            El servidor no té activat el login per contrasenya. Defineix{" "}
            <code className="rounded border border-white/15 bg-black/25 px-1 py-0.5 text-xs text-zinc-100">
              AUTH_ALLOW_CREDENTIALS=true
            </code>{" "}
            al backend i regenera l&apos;app amb{" "}
            <code className="rounded border border-white/15 bg-black/25 px-1 py-0.5 text-xs text-zinc-100">
              NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS=true
            </code>{" "}
            si cal.
          </p>
        )}
        {error !== null ? (
          <p className="max-w-sm text-center text-sm font-medium text-red-200 drop-shadow">
            {error}
          </p>
        ) : null}
      </div>

      {credentialsLoginEnabled ? (
        <div className="relative z-10 w-full max-w-sm rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Entrada
          </h2>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setSubmitting(true);
              void (async () => {
                try {
                  const res = await apiFetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email,
                      password,
                    }),
                  });
                  const raw = await res.text();
                  let data: { error?: string; token?: string } = {};
                  try {
                    data = JSON.parse(raw) as { error?: string; token?: string };
                  } catch {
                    /* resposta HTML o buida */
                  }
                  if (!res.ok) {
                    setError(
                      messageForLoginFailure(
                        res.status,
                        typeof data.error === "string" ? data.error : undefined,
                      ),
                    );
                    return;
                  }
                  if (typeof data.token !== "string" || data.token.length === 0) {
                    setError("Resposta invàlida del servidor d’autenticació.");
                    return;
                  }
                  await completeLoginWithToken(data.token);
                  router.push(callbackUrl);
                  router.refresh();
                } catch {
                  const netHint =
                    getApiBaseUrl().length > 0
                      ? ` No s’ha pogut completar la petició cap a ${apiUrl("/api/auth/login")} (xarxa, CORS o certificat).`
                      : " Comprova que `next dev` o `next start` està en marxa.";
                  setError(
                    `No s’ha pogut contactar amb el servidor d’autenticació.${netHint}`,
                  );
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
                autoComplete="current-password"
                required
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
              className="mt-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {submitting ? "Entrant…" : "Entra"}
            </button>
          </form>

          {registrationUiShown ? (
            <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
              No tens compte?{" "}
              <Link
                href={registerHref}
                className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
              >
                Registra&apos;t
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="relative z-10 text-center text-sm text-zinc-200/90 drop-shadow-sm">
        <a
          href={privacyPolicyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sky-300 underline decoration-sky-400/50 underline-offset-2 hover:text-white"
        >
          Política de privacitat
        </a>
      </p>
    </div>
  );
}
