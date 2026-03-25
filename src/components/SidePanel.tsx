"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useMunicipalities } from "@/store/useMunicipalities";
import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";
import { parseVisitListJson } from "@/lib/visitListJson";

export default function SidePanel(): React.ReactElement | null {
  const selected = useMunicipalities((s) => s.selected);
  const clearSelection = useMunicipalities((s) => s.clearSelection);
  const requestMunicipalitiesRefresh = useMunicipalities(
    (s) => s.requestMunicipalitiesRefresh,
  );

  const [displayName, setDisplayName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [visits, setVisits] = useState<VisitWithMediaPrimitives[]>([]);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    if (selected === null) {
      setDisplayName("");
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

    if (fromMap.length > 0) {
      setDisplayName(fromMap);
    } else {
      setDisplayName(`INE ${id}`);
    }

    void (async (): Promise<void> => {
      if (fromMap.length === 0) {
        try {
          const res = await fetch("/api/municipalities");
          if (res.ok) {
            const list: unknown = await res.json();
            if (Array.isArray(list)) {
              for (const item of list) {
                if (
                  typeof item === "object" &&
                  item !== null &&
                  (item as { id?: unknown }).id === id &&
                  typeof (item as { name?: unknown }).name === "string"
                ) {
                  setDisplayName((item as { name: string }).name);
                  break;
                }
              }
            }
          }
        } catch {
          /* mantenim fallback */
        }
      }

      setLoadingVisits(true);
      try {
        const res = await fetch(
          `/api/visits?municipalityId=${encodeURIComponent(id)}`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${String(res.status)}`);
        }
        const json: unknown = await res.json();
        if (!Array.isArray(json)) {
          throw new Error("Resposta invàlida");
        }
        setVisits(parseVisitListJson(json));
      } catch {
        setVisitsError("No s’han pogut carregar les visites.");
        setVisits([]);
      } finally {
        setLoadingVisits(false);
      }
    })();
  }, [selected]);

  if (selected === null) {
    return null;
  }

  const handleMarkVisited = async (): Promise<void> => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          municipalityId: selected.id,
          visitedAt: new Date().toISOString(),
          notes: notes.trim().length > 0 ? notes.trim() : undefined,
        }),
      });

      if (res.status === 404) {
        setSubmitError(
          "Municipi no trobat a la base de dades. Executa npm run db:seed després de migrate.",
        );
        return;
      }

      if (!res.ok) {
        const errJson: unknown = await res.json().catch(() => null);
        const msg =
          typeof errJson === "object" &&
          errJson !== null &&
          typeof (errJson as { error?: unknown }).error === "string"
            ? (errJson as { error: string }).error
            : `Error HTTP ${String(res.status)}`;
        setSubmitError(msg);
        return;
      }

      requestMunicipalitiesRefresh();
      setNotes("");

      const listRes = await fetch(
        `/api/visits?municipalityId=${encodeURIComponent(selected.id)}`,
      );
      if (listRes.ok) {
        const json: unknown = await listRes.json();
        setVisits(parseVisitListJson(json));
      }
    } catch {
      setSubmitError("Error de xarxa en registrar la visita.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 z-[1000] flex h-full w-80 flex-col gap-3 border-l border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Municipi
        </h2>
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
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {displayName}
      </p>
      <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {selected.id}
      </p>
      <Link
        href={`/municipality/${encodeURIComponent(selected.id)}`}
        className="text-sm font-medium text-sky-700 underline decoration-sky-700/40 underline-offset-2 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
        onClick={() => {
          clearSelection();
        }}
      >
        Obrir pàgina del municipi
      </Link>

      <button
        type="button"
        disabled={submitting}
        className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        onClick={() => {
          void handleMarkVisited();
        }}
      >
        {submitting ? "Enviant…" : "Marcar com a visitat"}
      </button>

      {submitError !== null ? (
        <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
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

      <div className="mt-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
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
              <li key={v.id} className="rounded border border-zinc-200 p-2 dark:border-zinc-700">
                <time className="block font-mono text-zinc-500">
                  {new Date(v.visitedAt).toLocaleString("ca-ES")}
                </time>
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
