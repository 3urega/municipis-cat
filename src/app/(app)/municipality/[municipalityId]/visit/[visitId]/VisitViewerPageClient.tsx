"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { MapBreadcrumb } from "@/components/MapBreadcrumb";
import { MediaType } from "@prisma/client";

import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";
import { AuthenticatedImg } from "@/components/AuthenticatedImg";
import { apiFetch } from "@/lib/apiUrl";
import { triggerAuthenticatedDownload } from "@/lib/authenticatedMedia";
import { parseVisitJson } from "@/lib/visitListJson";

function filenameForDownload(mediaPath: string, mediaId: string): string {
  const last = mediaPath.split("/").filter(Boolean).pop();
  if (last !== undefined && last.length > 0) {
    return last;
  }
  return `imatge-${mediaId}`;
}

type LightboxProps = {
  images: { id: string; url: string }[];
  startIndex: number;
  onClose: () => void;
};

function ImageLightbox({ images, startIndex, onClose }: LightboxProps): React.ReactElement {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === "ArrowRight") {
        setIndex((i) => Math.min(images.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, images.length]);

  const current = images[index];
  if (current === undefined) {
    return <></>;
  }

  return (
    <div
      className="fixed inset-0 z-[3000] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Visualització d'imatge"
      onClick={() => {
        onClose();
      }}
    >
      <button
        type="button"
        className="relative z-10 ml-auto mr-4 mt-4 shrink-0 rounded-md bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        Tancar (Esc)
      </button>
      <div
        className="flex min-h-0 flex-1 items-center justify-center p-4"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <button
          type="button"
          disabled={index <= 0}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-md bg-white/10 px-3 py-4 text-white disabled:opacity-30 hover:enabled:bg-white/20"
          aria-label="Imatge anterior"
          onClick={() => {
            setIndex((i) => Math.max(0, i - 1));
          }}
        >
          ‹
        </button>
        <AuthenticatedImg
          src={current.url}
          mediaId={current.id}
          mediaType={MediaType.image}
          alt=""
          className="max-h-[85vh] max-w-full object-contain"
        />
        <button
          type="button"
          disabled={index >= images.length - 1}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md bg-white/10 px-3 py-4 text-white disabled:opacity-30 hover:enabled:bg-white/20"
          aria-label="Imatge següent"
          onClick={() => {
            setIndex((i) => Math.min(images.length - 1, i + 1));
          }}
        >
          ›
        </button>
      </div>
      <div
        className="flex shrink-0 items-center justify-center gap-4 border-t border-white/10 py-3 text-sm text-white"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <span>
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          className="rounded-md bg-white/15 px-3 py-1.5 font-medium hover:bg-white/25"
          onClick={() => {
            void triggerAuthenticatedDownload(
              current.id,
              filenameForDownload(current.url, current.id),
            );
          }}
        >
          Descarregar
        </button>
      </div>
    </div>
  );
}

export function VisitViewerPageClient(): React.ReactElement {
  const params = useParams();
  const rawMunicipalityId = params.municipalityId;
  const rawVisitId = params.visitId;
  const municipalityId =
    typeof rawMunicipalityId === "string" ? rawMunicipalityId : "";
  const visitId = typeof rawVisitId === "string" ? rawVisitId : "";

  const [visit, setVisit] = useState<VisitWithMediaPrimitives | null>(null);
  const [municipalityName, setMunicipalityName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visitId.length === 0) {
      setLoading(false);
      setError("ID de visita invàlid.");
      return;
    }

    let cancelled = false;

    void (async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/visits/${encodeURIComponent(visitId)}`);
        if (res.status === 404) {
          if (!cancelled) {
            setError("Visita no trobada.");
            setVisit(null);
          }
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${String(res.status)}`);
        }
        const json: unknown = await res.json();
        const parsed = parseVisitJson(json);
        if (parsed === null) {
          throw new Error("Resposta invàlida");
        }
        if (
          municipalityId.length > 0 &&
          parsed.municipalityId !== municipalityId
        ) {
          if (!cancelled) {
            setError("Aquesta visita no pertany al municipi de l'URL.");
            setVisit(null);
          }
          return;
        }
        if (!cancelled) {
          setVisit(parsed);
        }

        if (municipalityId.length > 0 && !cancelled) {
          const mRes = await apiFetch("/api/municipalities");
          if (mRes.ok) {
            const list: unknown = await mRes.json();
            if (Array.isArray(list)) {
              for (const item of list) {
                if (
                  typeof item === "object" &&
                  item !== null &&
                  (item as { id?: unknown }).id === municipalityId &&
                  typeof (item as { name?: unknown }).name === "string"
                ) {
                  setMunicipalityName((item as { name: string }).name);
                  break;
                }
              }
            }
          }
        }
      } catch {
        if (!cancelled) {
          setError("No s'ha pogut carregar la visita.");
          setVisit(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visitId, municipalityId]);

  const images =
    visit === null
      ? []
      : visit.media.filter((m) => m.type === MediaType.image);

  const munLabel =
    municipalityName.length > 0 ? municipalityName : municipalityId;

  return (
    <div className="mx-auto min-h-[calc(100dvh-3rem)] max-w-4xl px-4 py-6">
      {lightboxIndex !== null && images.length > 0 ? (
        <ImageLightbox
          images={images.map((m) => ({
            id: m.id,
            url: m.url,
          }))}
          startIndex={lightboxIndex}
          onClose={() => {
            setLightboxIndex(null);
          }}
        />
      ) : null}

      <MapBreadcrumb
        items={[
          { label: "Mapa", href: "/" },
          ...(municipalityId.length > 0
            ? [
                {
                  label: munLabel.length > 0 ? munLabel : "Municipi",
                  href: `/municipality/${encodeURIComponent(municipalityId)}`,
                },
              ]
            : []),
          { label: "Vista de visita" },
        ]}
      />

      {loading ? (
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">Carregant…</p>
      ) : null}

      {error !== null ? (
        <p className="mt-6 text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {visit !== null && !loading && error === null ? (
        <>
          <header className="mt-6 border-b border-zinc-200 pb-6 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Data de la visita
            </p>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {new Date(visit.visitedAt).toLocaleString("ca-ES", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </h1>
          </header>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Notes
            </h2>
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
              <p className="whitespace-pre-wrap">
                {visit.notes !== null && visit.notes.length > 0
                  ? visit.notes
                  : "Sense notes."}
              </p>
            </div>
          </section>

          {images.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Fotos ({String(images.length)})
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Feu clic per ampliar. Dreceres: fletxes per canviar imatge, Esc
                per tancar.
              </p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {images.map((m, i) => (
                  <li key={m.id} className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="group overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-800"
                      onClick={() => {
                        setLightboxIndex(i);
                      }}
                    >
                      <AuthenticatedImg
                        src={m.url}
                        mediaId={m.id}
                        mediaType={MediaType.image}
                        alt=""
                        className="h-56 w-full object-cover transition group-hover:brightness-95"
                      />
                    </button>
                    <button
                      type="button"
                      className="text-center text-sm font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
                      onClick={() => {
                        void triggerAuthenticatedDownload(
                          m.id,
                          filenameForDownload(m.url, m.id),
                        );
                      }}
                    >
                      Descarregar aquesta foto
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
              Aquesta visita no té fotos.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
