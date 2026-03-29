"use client";

import { DEV_SUPERADMIN_EMAIL } from "@/lib/devAuth";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, apiUrl, getApiBaseUrl } from "@/lib/apiUrl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type LoginFormProps = {
  credentialsLoginEnabled: boolean;
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
    return "Correu o contrasenya incorrectes. Si entres des de l’app i el servidor és remot, comprova que la contrasenya coincideix amb el seed d’aquella base de dades (no amb la teva PostgreSQL local).";
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
}: LoginFormProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const { completeLoginWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [devPassword, setDevPassword] = useState("");
  const [devSubmitting, setDevSubmitting] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-100 px-4 pb-12 pt-[calc(3rem+env(safe-area-inset-top,0px))] dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Iniciar sessió
        </h1>
        {credentialsLoginEnabled ? (
          <p className="max-w-sm text-center text-sm text-zinc-600 dark:text-zinc-400">
            Compte de desenvolupament (email fixe a sota). Si l’app Capacitor parla amb Railway,
            l’usuari ha d’existir{" "}
            <em className="not-italic font-medium text-zinc-700 dark:text-zinc-300">
              a la base de dades d’aquell servidor
            </em>
            , no necessàriament a la teva PostgreSQL local. Variables: backend{" "}
            <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
              AUTH_ALLOW_CREDENTIALS=true
            </code>
            ; build estàtic{" "}
            <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
              NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS=true
            </code>
            .
          </p>
        ) : (
          <p className="max-w-sm text-center text-sm text-zinc-600 dark:text-zinc-400">
            El servidor no té activat el login per contrasenya. Defineix{" "}
            <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
              AUTH_ALLOW_CREDENTIALS=true
            </code>{" "}
            al backend i regenera l&apos;app amb{" "}
            <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
              NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS=true
            </code>{" "}
            si cal.
          </p>
        )}
        {error !== null ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      {credentialsLoginEnabled ? (
        <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Entra com a dev / superadmin
          </h2>
          <p className="mt-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
            {DEV_SUPERADMIN_EMAIL}
          </p>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setDevSubmitting(true);
              void (async () => {
                try {
                  const res = await apiFetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: DEV_SUPERADMIN_EMAIL,
                      password: devPassword,
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
                  setDevSubmitting(false);
                }
              })();
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
              {devSubmitting ? "Entrant…" : "Entra"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
