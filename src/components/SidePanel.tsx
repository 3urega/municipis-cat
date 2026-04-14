"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";
import { apiFetch } from "@/lib/apiUrl";
import { useMunicipalities } from "@/store/useMunicipalities";
import { createVisitOfflineFirst } from "@/lib/offline/createVisitOfflineFirst";
import { VISITS_OFFLINE_SYNCED_EVENT } from "@/lib/offline/offlineVisitConstants";
import {
  buildMergedVisitsList,
  type VisitWithOfflineMeta,
} from "@/lib/offline/mergePendingVisits";
import { parseVisitListJson } from "@/lib/visitListJson";

export default function SidePanel(): React.ReactElement | null {
  const router = useRouter();
  const { data: session } = useAuth();
  const userId = session?.user?.id;
  const userPlan = session?.user?.plan ?? "FREE";
  const selected = useMunicipalities((s) => s.selected);
  const clearSelection = useMunicipalities((s) => s.clearSelection);
  const requestMunicipalitiesRefresh = useMunicipalities(
    (s) => s.requestMunicipalitiesRefresh,
  );

  const [displayName, setDisplayName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [visits, setVisits] = useState<VisitWithOfflineMeta[]>([]);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [comarcaName, setComarcaName] = useState<string | null>(null);

  useEffect(() => {
    if (selected === null) {
      setDisplayName("");
      setComarcaName(null);
      setNotes("");
      setVisits([]);
      setVisitsError(null);
      setSubmitError(null);
      return;
    }

    const id = selected.id;
    const fromMap = selected.name.trim();

    setSubmitError(null);
    setVisitsError(null);
    setNotes("");
    setVisits([]);
    setComarcaName(null);

    if (fromMap.length > 0) {
      setDisplayName(fromMap);
    } else {
      setDisplayName(`INE ${id}`);
    }

    void (async (): Promise<void> => {
      try {
        const res = await apiFetch("/api/municipalities");
        if (res.ok) {
          const list: unknown = await res.json();
          if (Array.isArray(list)) {
            for (const item of list) {
              if (
                typeof item === "object" &&
                item !== null &&
                (item as { id?: unknown }).id === id
              ) {
                if (fromMap.length === 0) {
                  const nm = (item as { name?: unknown }).name;
                  if (typeof nm === "string" && nm.length > 0) {
                    setDisplayName(nm);
                  }
                }
                const cn = (item as { comarcaName?: unknown }).comarcaName;
                if (typeof cn === "string" && cn.length > 0) {
                  setComarcaName(cn);
                }
                break;
              }
            }
          }
        }
      } catch {
        /* mantenim fallback */
      }

      setLoadingVisits(true);
      try {
        const res = await apiFetch(
          `/api/visits?municipalityId=${encodeURIComponent(id)}`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${String(res.status)}`);
        }
        const json: unknown = await res.json();
        if (!Array.isArray(json)) {
          throw new Error("Resposta invàlida");
        }
        const api = parseVisitListJson(json);
        if (typeof userId === "string") {
          setVisits(await buildMergedVisitsList(userId, id, api, userPlan));
        } else {
          setVisits(api.map((v) => ({ ...v, offlinePending: false })));
        }
        setVisitsError(null);
      } catch {
        if (typeof userId === "string") {
          setVisits(await buildMergedVisitsList(userId, id, [], userPlan));
          setVisitsError(null);
        } else {
          setVisitsError("No s’han pogut carregar les visites.");
          setVisits([]);
        }
      } finally {
        setLoadingVisits(false);
      }
    })();
  }, [selected, userId, userPlan]);

  useEffect(() => {
    const onSynced = (): void => {
      if (selected === null || typeof userId !== "string") {
        return;
      }
      void (async (): Promise<void> => {
        const id = selected.id;
        try {
          const res = await apiFetch(
            `/api/visits?municipalityId=${encodeURIComponent(id)}`,
          );
          if (!res.ok) {
            setVisits(await buildMergedVisitsList(userId, id, [], userPlan));
            return;
          }
          const json: unknown = await res.json();
          if (!Array.isArray(json)) {
            return;
          }
          const api = parseVisitListJson(json);
          setVisits(await buildMergedVisitsList(userId, id, api, userPlan));
        } catch {
          setVisits(await buildMergedVisitsList(userId, id, [], userPlan));
        }
      })();
    };
    window.addEventListener(VISITS_OFFLINE_SYNCED_EVENT, onSynced);
    return () => {
      window.removeEventListener(VISITS_OFFLINE_SYNCED_EVENT, onSynced);
    };
  }, [selected, userId, userPlan]);

  if (selected === null) {
    return null;
  }

  const handleMarkVisited = async (): Promise<void> => {
    setSubmitError(null);
    setSubmitting(true);
    const municipalityId = selected.id;
    if (typeof userId !== "string") {
      setSubmitError("Cal iniciar sessió.");
      setSubmitting(false);
      return;
    }
    try {
      const result = await createVisitOfflineFirst(userId, {
        municipalityId,
        visitedAt: new Date().toISOString(),
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
              ? "Municipi no trobat a la base de dades. Executa npm run db:seed després de migrate."
              : result.message,
          );
        }
        return;
      }

      if (result.kind === "remote") {
        requestMunicipalitiesRefresh();
        setNotes("");
        clearSelection();
        router.push(
          `/municipality/${encodeURIComponent(municipalityId)}?editVisit=${encodeURIComponent(result.visit.id)}`,
        );
        return;
      }

      let api: VisitWithMediaPrimitives[] = [];
      try {
        const res = await apiFetch(
          `/api/visits?municipalityId=${encodeURIComponent(municipalityId)}`,
        );
        if (res.ok) {
          const json: unknown = await res.json();
          if (Array.isArray(json)) {
            api = parseVisitListJson(json);
          }
        }
      } catch {
        /* sense API: només pendents */
      }
      setVisits(
        await buildMergedVisitsList(userId, municipalityId, api, userPlan),
      );
      setNotes("");
      setSubmitError(null);
    } catch (e) {
      setSubmitError(
        e instanceof Error
          ? e.message
          : "Error en registrar la visita. Torna-ho a provar.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1000] box-border flex max-h-[50dvh] min-h-0 min-w-0 touch-pan-y flex-col gap-3 overflow-y-auto rounded-t-2xl border-t border-zinc-200 bg-white pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.35)] md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:max-h-none md:h-full md:w-80 md:overflow-x-visible md:rounded-none md:border-l md:border-t-0 md:p-4 md:shadow-lg"
    >
      <div className="flex items-start justify-end gap-2">
        <button
          type="button"
          className="shrink-0 text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          onClick={() => {
            clearSelection();
          }}
        >
          Tancar
        </button>
      </div>
      <p className="min-w-0 break-words text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {displayName}
      </p>
      {comarcaName !== null ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Comarca: {comarcaName}
        </p>
      ) : null}
      <p className="min-w-0 break-all font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {selected.id}
      </p>
      <Link
        href={`/municipality/${encodeURIComponent(selected.id)}`}
        className="min-w-0 break-words text-sm font-medium text-sky-700 underline decoration-sky-700/40 underline-offset-2 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
        onClick={() => {
          clearSelection();
        }}
      >
        Obrir pàgina del municipi
      </Link>

      <button
        type="button"
        disabled={submitting}
        className="box-border w-full min-w-0 shrink-0 self-stretch rounded-md bg-emerald-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        onClick={() => {
          void handleMarkVisited();
        }}
      >
        {submitting ? "Enviant…" : "Marcar com a visitat"}
      </button>

      {submitError !== null ? (
        <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
      ) : null}

      <label className="hidden flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400 md:flex">
        Notes (es desen amb el proper registre de visita)
        <textarea
          className="min-h-[100px] w-full rounded-md border border-zinc-300 bg-white p-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="Apunts…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
          }}
        />
      </label>

      <div className="mt-2 min-w-0 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Visites
        </h3>
        {loadingVisits ? (
          <p className="text-xs text-zinc-500">Carregant…</p>
        ) : visitsError !== null ? (
          <p className="text-xs text-amber-700 dark:text-amber-500">
            {visitsError}
          </p>
        ) : visits.length === 0 ? (
          <p className="text-xs text-zinc-500">Encara no hi ha visites.</p>
        ) : (
          <ul className="max-h-40 space-y-2 overflow-y-auto text-xs text-zinc-700 dark:text-zinc-300">
            {visits.map((v) => (
              <li
                key={v.id}
                className="min-w-0 rounded border border-zinc-200 p-2 dark:border-zinc-700"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <time className="block font-mono text-zinc-500">
                    {new Date(v.visitedAt).toLocaleString("ca-ES")}
                  </time>
                  {v.offlinePending ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      Pendent de sincronitzar
                    </span>
                  ) : null}
                </div>
                {v.notes !== null && v.notes.length > 0 ? (
                  <p className="mt-1 whitespace-pre-wrap">{v.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
