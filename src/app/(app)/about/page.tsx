import { MapBreadcrumb } from "@/components/MapBreadcrumb";
import { APP_VERSION } from "@/lib/appVersion";
import { getPrivacyPolicyUrl } from "@/lib/privacyPolicyUrl";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre l'app",
  description:
    "Informació sobre Catalunya Map, el seu autor i com es manté el projecte.",
};

export default function AboutPage(): React.ReactElement {
  const privacyPolicyUrl = getPrivacyPolicyUrl();

  return (
    <div className="mx-auto min-h-[calc(100dvh-3rem)] max-w-2xl px-4 py-6">
      <MapBreadcrumb
        items={[{ label: "Mapa", href: "/" }, { label: "Sobre l'app" }]}
      />
      <header className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sobre aquesta app
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Versió {APP_VERSION}
        </p>
      </header>

      <div className="space-y-10 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section className="border-b border-zinc-200 pb-10 dark:border-zinc-800">
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Qui sóc
          </h2>
          <p>
            Soc un desenvolupador freelance i programador senior. He creat
            aquesta app com a projecte personal per explorar una manera diferent
            de portar un diari dels llocs que he visitat.
          </p>
        </section>

        <section className="border-b border-zinc-200 pb-10 dark:border-zinc-800">
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Sobre l&apos;app
          </h2>
          <p>
            Aquesta aplicació et permet registrar els municipis que has visitat
            a Catalunya, afegir notes i construir el teu propi mapa personal.
          </p>
        </section>

        <section className="border-b border-zinc-200 pb-10 dark:border-zinc-800">
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Privacitat
          </h2>
          <p className="mb-3">
            Pots consultar la política de privacitat i el tractament de dades en
            aquest enllaç:
          </p>
          <p>
            <a
              href={privacyPolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sky-700 underline decoration-sky-700/40 underline-offset-2 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Política de privacitat
            </a>
          </p>
        </section>

        <section className="border-b border-zinc-200 pb-10 dark:border-zinc-800">
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Com es manté
          </h2>
          <p>
            Aquesta app es manté gràcies als anuncis que es mostren de manera
            puntual. Cada visualització ajuda a cobrir els costos
            d&apos;infraestructura i a continuar millorant el projecte.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Contacte
          </h2>
          <p className="mb-4">
            Aquest projecte s&apos;emmarca en el meu univers digital centrat a{" "}
            <span className="whitespace-nowrap">eurega.es</span>: hi explico la
            meva trajectòria i com puc ajudar en projectes de programari. Si vols
            saber-ne més o treballar amb mi, visita la web:
          </p>
          <p>
            <a
              href="https://eurega.es"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sky-700 underline decoration-sky-700/40 underline-offset-2 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
            >
              eurega.es
            </a>
          </p>
        </section>
      </div>

      <div className="mt-12 flex justify-center border-t border-zinc-200 pt-10 dark:border-zinc-800">
        <Link
          href="/"
          className="inline-flex rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Tornar al mapa
        </Link>
      </div>
    </div>
  );
}
