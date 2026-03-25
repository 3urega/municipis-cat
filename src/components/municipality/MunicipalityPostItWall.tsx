"use client";

import { MediaType } from "@prisma/client";

import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";

const EXCERPT_LEN = 25;

function excerptForPostIt(notes: string | null): string {
  const text =
    notes !== null && notes.trim().length > 0 ? notes.trim() : "Sense notes";
  if (text.length <= EXCERPT_LEN) {
    return text;
  }
  return `${text.slice(0, EXCERPT_LEN)}...`;
}

type MunicipalityPostItWallProps = {
  visits: VisitWithMediaPrimitives[];
  loading: boolean;
  onOpenVisit: (visit: VisitWithMediaPrimitives) => void;
};

export function MunicipalityPostItWall({
  visits,
  loading,
  onOpenVisit,
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
        const firstImg = v.media.find((m) => m.type === MediaType.image);
        return (
          <li key={v.id}>
            <button
              type="button"
              className="group relative w-full rounded-sm border border-amber-200/80 bg-[#fff8dc] p-4 pb-10 text-left shadow-md ring-1 ring-black/5 transition hover:z-10 hover:rotate-[-0.5deg] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-900/40 dark:bg-amber-950/50 dark:ring-white/10"
              onClick={() => {
                onOpenVisit(v);
              }}
            >
              <time
                className="absolute right-2 top-2 text-[10px] font-medium uppercase tracking-wide text-amber-900/70 dark:text-amber-200/80"
                dateTime={v.visitedAt}
              >
                {new Date(v.visitedAt).toLocaleDateString("ca-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
              {firstImg !== undefined ? (
                // eslint-disable-next-line @next/next/no-img-element -- URLs dinàmiques d’upload local
                <img
                  src={firstImg.url}
                  alt=""
                  className="mb-2 h-20 w-full rounded object-cover opacity-90"
                />
              ) : null}
              <p className="whitespace-pre-wrap pr-14 text-sm leading-snug text-amber-950 dark:text-amber-50">
                {excerptForPostIt(v.notes)}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
