"use client";

import Link from "next/link";

import type { VisitWithOfflineMeta } from "@/lib/offline/mergePendingVisits";

/** Dilluns, 15 d’abril de 2026 (sense hora). */
function visitPreviewDate(visitedAt: string): string {
  const d = new Date(visitedAt);
  return d.toLocaleDateString("ca-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function hrefForVisit(v: VisitWithOfflineMeta): string {
  const mid = encodeURIComponent(v.municipalityId);
  const vid = encodeURIComponent(v.id);
  return v.offlinePending === true
    ? `/municipality/${mid}?editVisit=${vid}`
    : `/municipality/${mid}/visit/${vid}`;
}

type MunicipalityPostItWallProps = {
  visits: VisitWithOfflineMeta[];
  loading: boolean;
};

export function MunicipalityPostItWall({
  visits,
  loading,
}: MunicipalityPostItWallProps): React.ReactElement {
  if (loading) {
    return <p className="text-sm text-zinc-500">Carregant notes…</p>;
  }

  if (visits.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Encara no hi ha visites. Crea’n una a sota.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visits.map((v) => {
        const href = hrefForVisit(v);
        return (
          <li key={v.id}>
            <Link
              href={href}
              className="group relative block w-full overflow-hidden rounded-sm border border-emerald-200/90 bg-emerald-50 p-4 pr-14 pt-5 text-left shadow-md ring-1 ring-emerald-900/5 transition hover:z-10 hover:rotate-[-0.5deg] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:ring-white/10 dark:hover:bg-emerald-950/55"
            >
              {/* Simulació vora superior dreta plegada cap endavant */}
              <span
                className="pointer-events-none absolute right-0 top-0 z-[1] block h-0 w-0 border-l-[22px] border-t-[22px] border-l-transparent border-t-emerald-200/95 shadow-[-2px_2px_3px_rgba(15,80,50,0.12)] dark:border-t-emerald-700/90"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute right-[2px] top-[2px] z-[2] block h-0 w-0 border-l-[16px] border-t-[16px] border-l-transparent border-t-white/35 dark:border-t-white/10"
                aria-hidden
              />
              {v.offlinePending ? (
                <div className="absolute right-2 top-8 z-[3] flex flex-col items-end gap-0.5">
                  <span className="rounded bg-emerald-600/90 px-1 text-[9px] font-medium uppercase tracking-wide text-white dark:bg-emerald-500/90">
                    Pendent
                    {v.offlinePendingImageCount !== undefined &&
                    v.offlinePendingImageCount > 0
                      ? ` · ${String(v.offlinePendingImageCount)} img`
                      : ""}
                  </span>
                </div>
              ) : null}
              <p className="relative z-0 whitespace-pre-wrap pr-1 text-sm font-medium leading-snug text-emerald-950 dark:text-emerald-50">
                <time dateTime={v.visitedAt}>
                  {visitPreviewDate(v.visitedAt)}
                </time>
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
