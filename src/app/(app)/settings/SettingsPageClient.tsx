"use client";

import Link from "next/link";

import {
  getPrivacyPolicyUrl,
  hasConfiguredPrivacyPolicyUrl,
} from "@/lib/privacyPolicyUrl";

export function SettingsPageClient(): React.ReactElement {
  const privacyUrl = getPrivacyPolicyUrl();
  const privacyConfigured = hasConfiguredPrivacyPolicyUrl();

  return (
    <main className="mx-auto max-w-lg px-4 py-6 text-zinc-800 dark:text-zinc-100">
      <h1 className="text-xl font-semibold">Configuració</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Informació sobre dades i privacitat.
      </p>

      <section className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Privacitat
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <a
            href={privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
          >
            Política de privacitat
          </a>
          {privacyConfigured ? null : (
            <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
              En producció, configura{" "}
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                NEXT_PUBLIC_PRIVACY_POLICY_URL
              </code>{" "}
              amb la URL pública real (vegeu{" "}
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                docs/google-play/privacy-policy.md
              </code>
              ).
            </span>
          )}
        </p>
      </section>

      <section className="mt-4 space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Ús de dades
        </h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li>
            Les <strong>fotos</strong> que adjuntes a una visita es guarden al
            servidor vinculades al teu compte.
          </li>
          <li>
            Les <strong>visitas</strong> (municipi, data, notes) es guarden per
            usuari; no es comparteixen amb altres usuaris de l&apos;app.
          </li>
          <li>
            No venem les teves dades personals. El mapa i l&apos;explorador
            mostren només informació que ja has desat o dades públiques de
            municipis.
          </li>
        </ul>
      </section>

      <Link
        href="/"
        className="mt-8 inline-block text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        Tornar al mapa
      </Link>
    </main>
  );
}
