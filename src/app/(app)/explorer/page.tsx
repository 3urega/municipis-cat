"use client";

import { VisitsExplorer } from "@/components/explorer/VisitsExplorer";
import { MapBreadcrumb } from "@/components/MapBreadcrumb";

export default function ExplorerPage(): React.ReactElement {
  return (
    <div className="mx-auto min-h-[calc(100dvh-3rem)] max-w-6xl px-4 py-6">
      <MapBreadcrumb
        items={[{ label: "Mapa", href: "/" }, { label: "Explorador de visites" }]}
      />
      <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Explorador de visites
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Recórregues les teves visites per mes, com a la galeria de fotos. Llisca
          horitzontalment i toca una targeta per obrir el detall.
        </p>
      </header>
      <VisitsExplorer />
    </div>
  );
}
