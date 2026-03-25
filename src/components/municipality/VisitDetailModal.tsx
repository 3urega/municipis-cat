"use client";

import { MediaType } from "@prisma/client";

import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";

type VisitDetailModalProps = {
  visit: VisitWithMediaPrimitives | null;
  onClose: () => void;
  onEdit: (visit: VisitWithMediaPrimitives) => void;
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt=""
                  className="h-32 w-full rounded-md object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="mt-6 w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
          onClick={() => {
            onEdit(visit);
            onClose();
          }}
        >
          Editar aquesta visita
        </button>
      </div>
    </div>
  );
}
