"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { MapBreadcrumb } from "@/components/MapBreadcrumb";
import { apiFetch } from "@/lib/apiUrl";
import { MunicipalityPostItWall } from "@/components/municipality/MunicipalityPostItWall";
import { VisitDetailModal } from "@/components/municipality/VisitDetailModal";
import { VisitEditorForm } from "@/components/municipality/VisitEditorForm";
import { VISITS_OFFLINE_SYNCED_EVENT } from "@/lib/offline/offlineVisitConstants";
import {
  buildMergedVisitsList,
  type VisitWithOfflineMeta,
} from "@/lib/offline/mergePendingVisits";
import { parseVisitListJson } from "@/lib/visitListJson";
import { useMunicipalities } from "@/store/useMunicipalities";

export default function MunicipalityDetailPage(): React.ReactElement {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useAuth();
  const userId = session?.user?.id;
  const rawId = params.municipalityId;
  const municipalityId = typeof rawId === "string" ? rawId : "";

  const pendingEditorScrollRef = useRef(false);

  const clearSelection = useMunicipalities((s) => s.clearSelection);
  const requestMunicipalitiesRefresh = useMunicipalities(
    (s) => s.requestMunicipalitiesRefresh,
  );

  const [municipalityName, setMunicipalityName] = useState<string>("");
  const [municipalityComarca, setMunicipalityComarca] = useState<string | null>(
    null,
  );
  const [visits, setVisits] = useState<VisitWithOfflineMeta[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisit, setModalVisit] = useState<VisitWithOfflineMeta | null>(
    null,
  );
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);

  const reloadVisits = useCallback(async (): Promise<void> => {
    if (municipalityId.length === 0) {
      return;
    }
    try {
      const res = await apiFetch(
        `/api/visits?municipalityId=${encodeURIComponent(municipalityId)}`,
      );
      if (!res.ok) {
        if (typeof userId === "string") {
          setVisits(
            await buildMergedVisitsList(userId, municipalityId, []),
          );
        } else {
          setVisits([]);
        }
        return;
      }
      const json: unknown = await res.json();
      const api = parseVisitListJson(json);
      if (typeof userId === "string") {
        setVisits(await buildMergedVisitsList(userId, municipalityId, api));
      } else {
        setVisits(api.map((v) => ({ ...v, offlinePending: false })));
      }
    } catch {
      if (typeof userId === "string") {
        setVisits(await buildMergedVisitsList(userId, municipalityId, []));
      } else {
        setVisits([]);
      }
    }
  }, [municipalityId, userId]);

  useEffect(() => {
    const onSynced = (): void => {
      void reloadVisits();
    };
    window.addEventListener(VISITS_OFFLINE_SYNCED_EVENT, onSynced);
    return () => {
      window.removeEventListener(VISITS_OFFLINE_SYNCED_EVENT, onSynced);
    };
  }, [reloadVisits]);

  useEffect(() => {
    void clearSelection();
  }, [clearSelection]);

  useEffect(() => {
    const raw = searchParams.get("editVisit");
    if (raw === null || raw.length === 0) {
      return;
    }
    setEditingVisitId(raw);
    pendingEditorScrollRef.current = true;

    const next = new URLSearchParams(searchParams.toString());
    next.delete("editVisit");
    const q = next.toString();
    router.replace(q.length > 0 ? `${pathname}?${q}` : pathname);
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (!pendingEditorScrollRef.current || editingVisitId === null) {
      return;
    }
    pendingEditorScrollRef.current = false;
    requestAnimationFrame(() => {
      document.getElementById("visit-editor")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [editingVisitId]);

  useEffect(() => {
    if (municipalityId.length === 0) {
      setLoading(false);
      setLoadError("ID de municipi invàlid.");
      return;
    }

    let cancelled = false;

    void (async (): Promise<void> => {
      setLoading(true);
      setLoadError(null);
      setMunicipalityComarca(null);
      try {
        const mRes = await apiFetch("/api/municipalities");
        if (!mRes.ok) {
          throw new Error("No s’han pogut carregar els municipis.");
        }
        const list: unknown = await mRes.json();
        let name = "";
        let comarca: string | null = null;
        if (Array.isArray(list)) {
          for (const item of list) {
            if (
              typeof item === "object" &&
              item !== null &&
              (item as { id?: unknown }).id === municipalityId &&
              typeof (item as { name?: unknown }).name === "string"
            ) {
              name = (item as { name: string }).name;
              const cn = (item as { comarcaName?: unknown }).comarcaName;
              if (typeof cn === "string" && cn.length > 0) {
                comarca = cn;
              }
              break;
            }
          }
        }
        if (!cancelled) {
          setMunicipalityName(name.length > 0 ? name : `INE ${municipalityId}`);
          setMunicipalityComarca(comarca);
        }

        await reloadVisits();
      } catch {
        if (!cancelled) {
          setLoadError("Error carregant les dades.");
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
  }, [municipalityId, reloadVisits]);

  const displayTitle =
    municipalityName.length > 0 ? municipalityName : municipalityId;

  if (municipalityId.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <MapBreadcrumb
          items={[{ label: "Mapa", href: "/" }, { label: "Municipi" }]}
        />
        <p className="text-red-600">Ruta invàlida.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100dvh-3rem)] max-w-6xl px-4 py-6">
      <VisitDetailModal
        visit={modalVisit}
        onClose={() => {
          setModalVisit(null);
        }}
        onEdit={(v) => {
          setEditingVisitId(v.id);
        }}
      />

      <MapBreadcrumb
        items={[
          { label: "Mapa", href: "/" },
          { label: displayTitle },
        ]}
      />

      {loadError !== null ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{loadError}</p>
      ) : null}

      <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {loading ? "Carregant…" : displayTitle}
        </h1>
        {municipalityComarca !== null && !loading ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Comarca: {municipalityComarca}
          </p>
        ) : null}
        <p className="mt-1 font-mono text-sm text-zinc-500">{municipalityId}</p>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/"
            className="text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-400"
          >
            Tornar al mapa
          </Link>
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Totes les notes
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Cada targeta és una visita. Fes-hi clic per obrir el resum; des d’allà
          pots obrir la vista completa en una finestra nova o editar.
        </p>
        <MunicipalityPostItWall
          visits={visits}
          loading={loading}
          onOpenVisit={(v) => {
            setModalVisit(v);
          }}
        />
      </section>

      <VisitEditorForm
        municipalityId={municipalityId}
        editingVisitId={editingVisitId}
        visits={visits}
        onSetEditingVisitId={setEditingVisitId}
        reloadVisits={reloadVisits}
        requestMunicipalitiesRefresh={requestMunicipalitiesRefresh}
      />
    </div>
  );
}
