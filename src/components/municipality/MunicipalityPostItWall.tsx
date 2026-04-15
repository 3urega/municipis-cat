"use client";

import Link from "next/link";

import type { VisitWithOfflineMeta } from "@/lib/offline/mergePendingVisits";

function visitTitleLine(visitedAt: string): string {
  const d = new Date(visitedAt);
  const dateStr = d.toLocaleDateString("ca-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("ca-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Visita del ${dateStr} · ${timeStr}`;
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
              className="group relative block w-full rounded-sm border border-amber-200/80 bg-[#fff8dc] p-4 pr-14 text-left shadow-md ring-1 ring-black/5 transition hover:z-10 hover:rotate-[-0.5deg] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-900/40 dark:bg-amber-950/50 dark:ring-white/10"
            >
              {v.offlinePending ? (
                <div className="absolute right-2 top-2 flex flex-col items-end gap-0.5">
                  <span className="rounded bg-amber-200/90 px-1 text-[9px] font-medium uppercase tracking-wide text-amber-950 dark:bg-amber-800/80 dark:text-amber-100">
                    Pendent
                    {v.offlinePendingImageCount !== undefined &&
                    v.offlinePendingImageCount > 0
                      ? ` · ${String(v.offlinePendingImageCount)} img`
                      : ""}
                  </span>
                </div>
              ) : null}
              <p className="whitespace-pre-wrap text-sm leading-snug text-amber-950 dark:text-amber-50">
                <time dateTime={v.visitedAt}>
                  {visitTitleLine(v.visitedAt)}
                </time>
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
