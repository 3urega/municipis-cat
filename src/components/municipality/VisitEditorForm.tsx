"use client";

import { MediaType } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";
import { createVisitOfflineFirst } from "@/lib/offline/createVisitOfflineFirst";
import {
  VISITS_OFFLINE_SYNCED_EVENT,
  type VisitsOfflineSyncedDetail,
} from "@/lib/offline/offlineVisitConstants";
import type { VisitWithOfflineMeta } from "@/lib/offline/mergePendingVisits";
import { parseVisitJson } from "@/lib/visitListJson";
import {
  deletePendingVisitIfOwned,
  getPendingVisitById,
  updatePendingVisitIfOwned,
} from "@/lib/offline/visitsDb";
import type { CreateVisitMediaBody } from "@/types/api";

function toDatetimeLocalValue(d: Date): string {
  const p = (n: number): string => {
    return String(n).padStart(2, "0");
  };
  return `${String(d.getFullYear())}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

type PendingUpload = {
  file: File;
  previewUrl: string;
};

type VisitEditorFormProps = {
  municipalityId: string;
  editingVisitId: string | null;
  visits: VisitWithOfflineMeta[];
  onSetEditingVisitId: (id: string | null) => void;
  reloadVisits: () => Promise<void>;
  requestMunicipalitiesRefresh: () => void;
};

async function uploadVisitImage(
  visitId: string,
  file: File,
): Promise<CreateVisitMediaBody> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `/api/visits/${encodeURIComponent(visitId)}/images`,
    {
      method: "POST",
      body: fd,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.length > 0 ? text : `HTTP ${String(res.status)}`);
  }
  const j: unknown = await res.json();
  if (
    typeof j !== "object" ||
    j === null ||
    typeof (j as { url?: unknown }).url !== "string" ||
    !(
      (j as { type?: unknown }).type === MediaType.image ||
      (j as { type?: unknown }).type === MediaType.link
    )
  ) {
    throw new Error("Resposta de pujada invàlida");
  }
  const o = j as { url: string; type: MediaType };
  return { url: o.url, type: o.type };
}

export function VisitEditorForm({
  municipalityId,
  editingVisitId,
  visits,
  onSetEditingVisitId,
  reloadVisits,
  requestMunicipalitiesRefresh,
}: VisitEditorFormProps): React.ReactElement {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [visitedAtLocal, setVisitedAtLocal] = useState("");
  const [notes, setNotes] = useState("");
  const [media, setMedia] = useState<CreateVisitMediaBody[]>([]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const syncedForIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (editingVisitId === null) {
      syncedForIdRef.current = null;
      setOfflineNotice(null);
      setPending((prev) => {
        for (const p of prev) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return [];
      });
      setVisitedAtLocal(toDatetimeLocalValue(new Date()));
      setNotes("");
      setMedia([]);
      setSubmitError(null);
      return;
    }

    if (syncedForIdRef.current === editingVisitId) {
      return;
    }

    const fromList = visits.find((v) => v.id === editingVisitId);
    if (fromList !== undefined) {
      syncedForIdRef.current = editingVisitId;
      setPending((prev) => {
        for (const p of prev) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return [];
      });
      setVisitedAtLocal(toDatetimeLocalValue(new Date(fromList.visitedAt)));
      setNotes(fromList.notes ?? "");
      setMedia(
        fromList.media.map((m) => ({
          type: m.type,
          url: m.url,
        })),
      );
      setSubmitError(null);
      setOfflineNotice(
        fromList.offlinePending === true
          ? "Aquesta visita és pendent de sincronitzar."
          : null,
      );
      return;
    }

    let cancelled = false;
    void (async (): Promise<void> => {
      const res = await fetch(
        `/api/visits/${encodeURIComponent(editingVisitId)}`,
      );
      if (res.ok && !cancelled) {
        const json: unknown = await res.json();
        const v = parseVisitJson(json);
        if (v === null || cancelled) {
          return;
        }
        syncedForIdRef.current = editingVisitId;
        setPending((prev) => {
          for (const p of prev) {
            URL.revokeObjectURL(p.previewUrl);
          }
          return [];
        });
        setVisitedAtLocal(toDatetimeLocalValue(new Date(v.visitedAt)));
        setNotes(v.notes ?? "");
        setMedia(
          v.media.map((m) => ({
            type: m.type,
            url: m.url,
          })),
        );
        setSubmitError(null);
        setOfflineNotice(null);
        return;
      }

      if (
        cancelled ||
        typeof userId !== "string" ||
        editingVisitId === null
      ) {
        return;
      }
      const row = await getPendingVisitById(userId, editingVisitId);
      if (row === undefined || cancelled) {
        return;
      }
      syncedForIdRef.current = editingVisitId;
      setPending((prev) => {
        for (const p of prev) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return [];
      });
      setVisitedAtLocal(toDatetimeLocalValue(new Date(row.visitedAt)));
      setNotes(row.notes ?? "");
      setMedia([]);
      setSubmitError(null);
      setOfflineNotice("Aquesta visita és pendent de sincronitzar.");
    })();

    return () => {
      cancelled = true;
    };
  }, [editingVisitId, visits, userId]);

  useEffect(() => {
    const onSynced = (ev: Event): void => {
      const detail = (ev as CustomEvent<VisitsOfflineSyncedDetail>).detail;
      if (
        detail === undefined ||
        editingVisitId === null ||
        !Array.isArray(detail.replacements)
      ) {
        return;
      }
      const hit = detail.replacements.find((r) => r.localId === editingVisitId);
      if (hit === undefined) {
        return;
      }
      syncedForIdRef.current = null;
      setOfflineNotice(null);
      onSetEditingVisitId(hit.remoteId);
      void reloadVisits();
    };
    window.addEventListener(VISITS_OFFLINE_SYNCED_EVENT, onSynced);
    return () => {
      window.removeEventListener(VISITS_OFFLINE_SYNCED_EVENT, onSynced);
    };
  }, [editingVisitId, onSetEditingVisitId, reloadVisits]);

  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const list = e.target.files;
    if (list === null) {
      return;
    }
    const added: PendingUpload[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const file = list[i];
      if (!file.type.startsWith("image/")) {
        continue;
      }
      added.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (added.length > 0) {
      setPending((p) => [...p, ...added]);
    }
    e.target.value = "";
  };

  const removePendingAt = (index: number): void => {
    setPending((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed !== undefined) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return copy;
    });
  };

  const removeMediaAt = (index: number): void => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (): Promise<void> => {
    setSubmitError(null);
    const visitedAt = new Date(visitedAtLocal);
    if (Number.isNaN(visitedAt.getTime())) {
      setSubmitError("Data o hora invàlides.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingVisitId === null) {
        if (typeof userId !== "string") {
          setSubmitError("Cal iniciar sessió.");
          return;
        }

        if (
          typeof navigator !== "undefined" &&
          !navigator.onLine &&
          (pending.length > 0 || media.length > 0)
        ) {
          setSubmitError("Les imatges només es poden pujar amb connexió.");
          return;
        }

        setOfflineNotice(null);
        const result = await createVisitOfflineFirst(userId, {
          municipalityId,
          visitedAt: visitedAt.toISOString(),
          notes: notes.trim().length > 0 ? notes.trim() : undefined,
        });

        if (!result.ok) {
          if (result.error === "auth") {
            setSubmitError("Cal iniciar sessió.");
          } else if (result.error === "parse") {
            setSubmitError("Resposta invàlida del servidor.");
          } else if (result.error === "storage") {
            setSubmitError(
              `No s’ha pogut desar la visita localment: ${result.message}`,
            );
          } else {
            setSubmitError(
              result.error === "http" && result.status === 404
                ? "Municipi no trobat a la base de dades."
                : result.message,
            );
          }
          return;
        }

        if (result.kind === "queued") {
          setOfflineNotice(
            "Visita desada en aquest dispositiu; es sincronitzarà automàticament amb connexió.",
          );
          await reloadVisits();
          onSetEditingVisitId(result.visit.id);
          syncedForIdRef.current = result.visit.id;
          return;
        }

        const created: VisitWithMediaPrimitives = result.visit;

        const combined: CreateVisitMediaBody[] = [...media];
        for (const p of pending) {
          combined.push(await uploadVisitImage(created.id, p.file));
        }

        if (pending.length > 0 || combined.length > 0) {
          const patchRes = await fetch(
            `/api/visits/${encodeURIComponent(created.id)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ media: combined }),
            },
          );
          if (!patchRes.ok) {
            setSubmitError("Visita creada però no s’han pogut guardar les imatges.");
            requestMunicipalitiesRefresh();
            await reloadVisits();
            onSetEditingVisitId(null);
            return;
          }
        }

        setPending((prev) => {
          for (const p of prev) {
            URL.revokeObjectURL(p.previewUrl);
          }
          return [];
        });
        requestMunicipalitiesRefresh();
        await reloadVisits();
        onSetEditingVisitId(null);
        syncedForIdRef.current = null;
        return;
      }

      if (typeof userId === "string") {
        const localPending = await getPendingVisitById(userId, editingVisitId);
        if (localPending !== undefined) {
          if (pending.length > 0) {
            setSubmitError(
              "No es poden pujar imatges mentre la visita encara no s’ha sincronitzat amb el servidor.",
            );
            return;
          }
          const updated = await updatePendingVisitIfOwned(
            userId,
            editingVisitId,
            {
              visitedAt: visitedAt.toISOString(),
              notes: notes.trim().length > 0 ? notes.trim() : null,
            },
          );
          if (updated) {
            setOfflineNotice(
              "Canvis desats en aquest dispositiu; es sincronitzaran automàticament amb connexió.",
            );
            requestMunicipalitiesRefresh();
            await reloadVisits();
            return;
          }
        }
      }

      const combined: CreateVisitMediaBody[] = [...media];
      for (const p of pending) {
        combined.push(await uploadVisitImage(editingVisitId, p.file));
      }

      const patchRes = await fetch(
        `/api/visits/${encodeURIComponent(editingVisitId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitedAt: visitedAt.toISOString(),
            notes: notes.trim().length > 0 ? notes.trim() : null,
            media: combined,
          }),
        },
      );

      if (patchRes.status === 404) {
        setSubmitError("Visita no trobada.");
        return;
      }

      if (!patchRes.ok) {
        const errJson: unknown = await patchRes.json().catch(() => null);
        const msg =
          typeof errJson === "object" &&
          errJson !== null &&
          typeof (errJson as { error?: unknown }).error === "string"
            ? (errJson as { error: string }).error
            : `Error ${String(patchRes.status)}`;
        setSubmitError(msg);
        return;
      }

      setPending((prev) => {
        for (const p of prev) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return [];
      });
      requestMunicipalitiesRefresh();
      await reloadVisits();
      onSetEditingVisitId(null);
      syncedForIdRef.current = null;
    } catch {
      setSubmitError("Error de xarxa o de pujada.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVisit = async (): Promise<void> => {
    if (editingVisitId === null) {
      return;
    }
    if (
      !window.confirm("Vols esborrar aquesta visita, les notes i les imatges?")
    ) {
      return;
    }
    setDeleting(true);
    setSubmitError(null);
    try {
      if (typeof userId === "string") {
        const deletedLocal = await deletePendingVisitIfOwned(
          userId,
          editingVisitId,
        );
        if (deletedLocal) {
          setOfflineNotice(null);
          setPending((prev) => {
            for (const p of prev) {
              URL.revokeObjectURL(p.previewUrl);
            }
            return [];
          });
          requestMunicipalitiesRefresh();
          await reloadVisits();
          onSetEditingVisitId(null);
          syncedForIdRef.current = null;
          return;
        }
      }

      const res = await fetch(
        `/api/visits/${encodeURIComponent(editingVisitId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setSubmitError("No s’ha pogut esborrar la visita.");
        return;
      }
      setPending((prev) => {
        for (const p of prev) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return [];
      });
      requestMunicipalitiesRefresh();
      await reloadVisits();
      onSetEditingVisitId(null);
      syncedForIdRef.current = null;
    } catch {
      setSubmitError("Error esborrant la visita.");
    } finally {
      setDeleting(false);
    }
  };

  const isNew = editingVisitId === null;
  const title = isNew ? "Nova visita" : "Editar visita";

  return (
    <section
      id="visit-editor"
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        {!isNew ? (
          <button
            type="button"
            className="text-sm font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
            onClick={() => {
              syncedForIdRef.current = null;
              onSetEditingVisitId(null);
            }}
          >
            + Nova visita
          </button>
        ) : null}
      </div>

      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Cada visita té les seves notes i imatges. Desa per enregistrar-ho al
        servidor.
      </p>

      <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Data i hora de la visita
        <input
          type="datetime-local"
          className="mt-1 w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          value={visitedAtLocal}
          disabled={submitting}
          onChange={(e) => {
            setVisitedAtLocal(e.target.value);
          }}
        />
      </label>

      <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Notes
        <textarea
          className="mt-1 min-h-[120px] w-full rounded-md border border-zinc-300 bg-white p-3 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="Apunts d’aquest dia…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
          }}
        />
      </label>

      <div className="mb-4">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Imatges
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-zinc-400 dark:file:bg-zinc-700 dark:file:text-zinc-200"
          onChange={handlePickFiles}
        />
        <ul className="mt-3 flex flex-wrap gap-3">
          {media.map((m, i) => (
            <li
              key={`${m.url}-${String(i)}`}
              className="relative h-24 w-24 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700"
            >
              {m.type === MediaType.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="block p-1 text-[10px] break-all">{m.url}</span>
              )}
              <button
                type="button"
                className="absolute right-0 top-0 rounded-bl bg-red-600 px-1.5 text-xs text-white"
                onClick={() => {
                  removeMediaAt(i);
                }}
              >
                ×
              </button>
            </li>
          ))}
          {pending.map((p, i) => (
            <li
              key={p.previewUrl}
              className="relative h-24 w-24 overflow-hidden rounded-md border border-dashed border-amber-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt=""
                className="h-full w-full object-cover opacity-90"
              />
              <button
                type="button"
                className="absolute right-0 top-0 rounded-bl bg-red-600 px-1.5 text-xs text-white"
                onClick={() => {
                  removePendingAt(i);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      {submitError !== null ? (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">
          {submitError}
        </p>
      ) : null}

      {offlineNotice !== null ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
          {offlineNotice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={submitting}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          onClick={() => {
            void handleSave();
          }}
        >
          {submitting ? "Guardant…" : "Desar"}
        </button>
        {!isNew ? (
          <button
            type="button"
            disabled={deleting || submitting}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={() => {
              void handleDeleteVisit();
            }}
          >
            {deleting ? "Esborrant…" : "Esborrar visita"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
