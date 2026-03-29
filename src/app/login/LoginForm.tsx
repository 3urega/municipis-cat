"use client";

import { useAuth } from "@/hooks/useAuth";
import { apiFetch, apiUrl, getApiBaseUrl } from "@/lib/apiUrl";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/registerValidation";
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

  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-100 px-4 pb-12 pt-[calc(3rem+env(safe-area-inset-top,0px))] dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Iniciar sessió
        </h1>
        {credentialsLoginEnabled ? (
          <p className="max-w-sm text-center text-sm text-zinc-600 dark:text-zinc-400">
            Correu i contrasenya. A l’app Android el token es desa de forma segura i la sessió es manté
            (fins a 30 dies). Al web amb el mateix domini que l’API també s’usa una cookie. Variables:
            backend{" "}
            <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
              AUTH_ALLOW_CREDENTIALS=true
            </code>
            ; build Capacitor{" "}
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
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
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
        </div>
      ) : null}

      {credentialsLoginEnabled && registrationUiShown ? (
        <div className="w-full max-w-sm rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            Crear compte
          </h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Mínim {String(PASSWORD_MIN_LENGTH)} caràcters. Després del registre
            pots iniciar sessió amb el mateix correu.
          </p>
          {registerError !== null ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {registerError}
            </p>
          ) : null}
          {registerSuccess !== null ? (
            <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
              {registerSuccess}
            </p>
          ) : null}
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setRegisterError(null);
              setRegisterSuccess(null);
              setRegisterSubmitting(true);
              void (async () => {
                try {
                  const res = await apiFetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: registerEmail,
                      password: registerPassword,
                    }),
                  });
                  const raw = await res.text();
                  let data: { error?: string } = {};
                  try {
                    data = JSON.parse(raw) as { error?: string };
                  } catch {
                    /* empty */
                  }
                  if (!res.ok) {
                    setRegisterError(
                      typeof data.error === "string" && data.error.length > 0
                        ? data.error
                        : `Error HTTP ${String(res.status)}`,
                    );
                    return;
                  }
                  setRegisterSuccess(
                    "Compte creat. Ara pots iniciar sessió amb el correu i la contrasenya.",
                  );
                  setEmail(registerEmail.trim().toLowerCase());
                  setRegisterPassword("");
                } catch {
                  setRegisterError(
                    "No s’ha pogut contactar amb el servidor de registre.",
                  );
                } finally {
                  setRegisterSubmitting(false);
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
                value={registerEmail}
                onChange={(ev) => {
                  setRegisterEmail(ev.target.value);
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
                value={registerPassword}
                onChange={(ev) => {
                  setRegisterPassword(ev.target.value);
                }}
              />
            </label>
            <button
              type="submit"
              disabled={registerSubmitting}
              className="mt-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {registerSubmitting ? "Registrant…" : "Registrar-se"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
