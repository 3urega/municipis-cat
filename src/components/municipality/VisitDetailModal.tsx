"use client";

import { MediaType } from "@prisma/client";
import Link from "next/link";

import type { VisitWithOfflineMeta } from "@/lib/offline/mergePendingVisits";
import { AuthenticatedImg } from "@/components/AuthenticatedImg";

type VisitDetailModalProps = {
  visit: VisitWithOfflineMeta | null;
  onClose: () => void;
  onEdit: (visit: VisitWithOfflineMeta) => void;
};

export function VisitDetailModal({
  visit,
  onClose,
  onEdit,
}: VisitDetailModalProps): React.ReactElement | null {
  if (visit === null) {
    return null;
  }

  const images = visit.media.filter((m) => m.type === MediaType.image);
  const viewerHref = `/municipality/${encodeURIComponent(visit.municipalityId)}/visit/${encodeURIComponent(visit.id)}`;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tancar"
        onClick={() => {
          onClose();
        }}
      />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <h2
            id="visit-modal-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            {new Date(visit.visitedAt).toLocaleString("ca-ES")}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              onClose();
            }}
          >
            Tancar
          </button>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
          {visit.notes !== null && visit.notes.length > 0 ? visit.notes : "Sense notes."}
        </p>
        {images.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {images.map((m) => (
              <li key={m.id}>
                <AuthenticatedImg
                  src={m.url}
                  mediaId={m.id}
                  mediaType={m.type}
                  alt=""
                  className="h-32 w-full rounded-md object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          {visit.offlinePending ? (
            <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              Vista completa disponible després de sincronitzar.
            </p>
          ) : (
            <Link
              href={viewerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Veure en finestra nova
            </Link>
          )}
          <button
            type="button"
            className="flex flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
            onClick={() => {
              onEdit(visit);
              onClose();
            }}
          >
            Editar aquesta visita
          </button>
        </div>
      </div>
    </div>
  );
}
