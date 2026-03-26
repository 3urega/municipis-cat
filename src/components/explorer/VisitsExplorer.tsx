"use client";

import { MediaType } from "@prisma/client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { VISITS_OFFLINE_SYNCED_EVENT } from "@/lib/offline/offlineVisitConstants";
import {
  buildMergedVisitsListAll,
  type VisitWithOfflineMeta,
} from "@/lib/offline/mergePendingVisits";
import { parseVisitListJson } from "@/lib/visitListJson";

function monthKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "0000-00";
  }
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${String(y)}-${String(m).padStart(2, "0")}`;
}

function monthHeadingLabel(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  if (ys === undefined || ms === undefined) {
    return monthKey;
  }
  const d = new Date(Number(ys), Number(ms) - 1, 15, 12, 0, 0, 0);
  return d.toLocaleDateString("ca-ES", {
    month: "long",
    year: "numeric",
  });
}

function firstImageUrl(visit: VisitWithOfflineMeta): string | null {
  const img = visit.media.find((m) => m.type === MediaType.image);
  return img !== undefined ? img.url : null;
}

function buildMunicipalityNameMap(
  list: unknown,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(list)) {
    return map;
  }
  for (const item of list) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const id = (item as { id?: unknown }).id;
    const name = (item as { name?: unknown }).name;
    if (typeof id === "string" && id.length > 0 && typeof name === "string") {
      map.set(id, name);
    }
  }
  return map;
}

async function fetchExplorerVisitsState(userId: string | undefined): Promise<{
  visits: VisitWithOfflineMeta[];
  municipalityNames: Map<string, string>;
}> {
  const [visitsRes, munRes] = await Promise.all([
    fetch("/api/explorer/visits"),
    fetch("/api/municipalities"),
  ]);

  if (!visitsRes.ok) {
    if (visitsRes.status === 401) {
      throw new Error("Cal iniciar sessió.");
    }
    throw new Error(`No s’han pogut carregar les visites (${String(visitsRes.status)}).`);
  }
  if (!munRes.ok) {
    throw new Error(`No s’han pogut carregar els municipis (${String(munRes.status)}).`);
  }

  const visitsJson: unknown = await visitsRes.json();
  const munJson: unknown = await munRes.json();

  const apiVisits = parseVisitListJson(visitsJson);
  const merged =
    typeof userId === "string"
      ? await buildMergedVisitsListAll(userId, apiVisits)
      : apiVisits.map((v) => ({ ...v, offlinePending: false }));
  return {
    visits: merged,
    municipalityNames: buildMunicipalityNameMap(munJson),
  };
}

export function VisitsExplorer(): React.ReactElement {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [visits, setVisits] = useState<VisitWithOfflineMeta[] | null>(null);
  const [municipalityNames, setMunicipalityNames] = useState<Map<string, string>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async (): Promise<void> => {
      setError(null);
      setVisits(null);
      try {
        const data = await fetchExplorerVisitsState(userId);
        if (cancelled) {
          return;
        }
        setVisits(data.visits);
        setMunicipalityNames(data.municipalityNames);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error desconegut.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const onSynced = (): void => {
      void (async (): Promise<void> => {
        try {
          const data = await fetchExplorerVisitsState(userId);
          setVisits(data.visits);
          setMunicipalityNames(data.municipalityNames);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error desconegut.");
        }
      })();
    };
    window.addEventListener(VISITS_OFFLINE_SYNCED_EVENT, onSynced);
    return () => {
      window.removeEventListener(VISITS_OFFLINE_SYNCED_EVENT, onSynced);
    };
  }, [userId]);

  const byMonth = useMemo(() => {
    if (visits === null) {
      return [];
    }
    const buckets = new Map<string, VisitWithOfflineMeta[]>();
    for (const v of visits) {
      const k = monthKeyFromIso(v.visitedAt);
      const list = buckets.get(k);
      if (list === undefined) {
        buckets.set(k, [v]);
      } else {
        list.push(v);
      }
    }
    const keys = [...buckets.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    return keys.map((key) => ({
      key,
      label: monthHeadingLabel(key),
      items: buckets.get(key) ?? [],
    }));
  }, [visits]);

  if (error !== null) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </p>
    );
  }

  if (visits === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregant visites…</p>
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        Encara no hi ha visites registrades. Explora el mapa i marca municipis com a visitats.
      </p>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {byMonth.map(({ key, label, items }) => (
        <section key={key} aria-labelledby={`month-${key}`}>
          <h2
            id={`month-${key}`}
            className="sticky top-12 z-10 -mx-4 mb-4 border-b border-zinc-200/90 bg-white/95 px-4 py-3 text-lg font-semibold tracking-tight text-zinc-900 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-50"
          >
            {label}
          </h2>
          <div
            className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 pt-1 [scrollbar-width:thin]"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {items.map((visit) => {
              const name =
                municipalityNames.get(visit.municipalityId)?.trim() ?? "";
              const municipalityLabel =
                name.length > 0 ? name : `INE ${visit.municipalityId}`;
              const preview = firstImageUrl(visit);
              const href =
                visit.offlinePending === true
                  ? `/municipality/${encodeURIComponent(visit.municipalityId)}?editVisit=${encodeURIComponent(visit.id)}`
                  : `/municipality/${encodeURIComponent(visit.municipalityId)}/visit/${encodeURIComponent(visit.id)}`;
              const notePreview =
                visit.notes !== null && visit.notes.trim().length > 0
                  ? visit.notes.trim()
                  : "Sense notes";

              return (
                <Link key={visit.id} href={href} className="group snap-center">
                  <article
                    className="flex w-[min(88vw,20rem)] shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-md ring-zinc-300/40 transition duration-200 ease-out hover:z-10 hover:scale-[1.02] hover:shadow-xl focus-within:ring-2 active:scale-[0.99] dark:border-zinc-700/90 dark:bg-zinc-900 dark:ring-zinc-600/50 dark:hover:shadow-black/40"
                    aria-label={`Visita a ${municipalityLabel}`}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      {preview !== null ? (
                        // eslint-disable-next-line @next/next/no-img-element -- visit URLs; lazy natiu
                        <img
                          src={preview}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                          Sense foto
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 p-4">
                      <p className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {municipalityLabel}
                        {visit.offlinePending === true ? (
                          <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                            Pendent
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {new Date(visit.visitedAt).toLocaleString("ca-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {notePreview}
                      </p>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
