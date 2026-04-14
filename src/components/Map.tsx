"use client";

import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import L from "leaflet";
import type { Layer, PathOptions } from "leaflet";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";

import {
  filterMunicipalityPolygonFeatures,
  getMunicipalityFromPolygonFeature,
  normalizeCatalunyaFeatureCollectionProjection,
  polygonMunicipalityStyle,
} from "@/lib/catalunyaGeoJson";
import {
  type MunicipiComarcaMap,
  findComarcaForMunicipalityId,
  isMunicipiComarcaMap,
} from "@/lib/municipiComarca";
import { mergeOutboxVisitCountsInto } from "@/lib/offline/outboxVisitCounts";
import { apiFetch } from "@/lib/apiUrl";
import {
  loadMunicipalitiesSnapshot,
  saveMunicipalitiesSnapshot,
} from "@/lib/offline/visitsDb";
import { useMapBasemap } from "@/store/useMapBasemap";
import { useMunicipalities } from "@/store/useMunicipalities";
import { useOfflineSync } from "@/store/useOfflineSync";

function isFeatureCollection(value: unknown): value is FeatureCollection {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const o = value as Record<string, unknown>;
  return o.type === "FeatureCollection" && Array.isArray(o.features);
}

function parseVisitCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.length > 0) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

function municipalityIdFromApiItem(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Coincideix claus INE si API i GeoJSON difereixen en zeros a l’esquerra. */
function visitCountForMunicipalityId(
  counts: Record<string, number>,
  geoId: string,
): number {
  const direct = counts[geoId];
  if (direct !== undefined) {
    return direct;
  }
  const padded = geoId.padStart(6, "0");
  if (padded !== geoId && counts[padded] !== undefined) {
    return counts[padded];
  }
  const trimmed = geoId.replace(/^0+/, "");
  if (
    trimmed.length > 0 &&
    trimmed !== geoId &&
    counts[trimmed] !== undefined
  ) {
    return counts[trimmed];
  }
  return 0;
}

/** Mateix criteri que visit counts: zeros a l’esquerra / variants INE. */
function municipalityIdsMatch(geoId: string, selectedId: string): boolean {
  if (geoId === selectedId) {
    return true;
  }
  const paddedGeo = geoId.padStart(6, "0");
  const paddedSel = selectedId.padStart(6, "0");
  if (paddedGeo === paddedSel) {
    return true;
  }
  const trimGeo = geoId.replace(/^0+/, "") || "0";
  const trimSel = selectedId.replace(/^0+/, "") || "0";
  return trimGeo === trimSel;
}

function boundsForSelectedMunicipality(
  featureCollection: FeatureCollection,
  selectedId: string,
): L.LatLngBounds | null {
  for (const feature of featureCollection.features) {
    const m = getMunicipalityFromPolygonFeature(feature);
    if (m === null) {
      continue;
    }
    if (!municipalityIdsMatch(m.id, selectedId)) {
      continue;
    }
    const b = L.geoJSON(feature).getBounds();
    return b.isValid() ? b : null;
  }
  return null;
}

/** Evita «0%» quan hi ha visites però el percentatge arrodonit a enter seria 0. */
function formatMunicipalityVisitPercentLabel(
  visited: number,
  total: number,
): string {
  if (total === 0 || visited === 0) {
    return "0";
  }
  const p = (visited / total) * 100;
  const oneDecimal = p.toFixed(1);
  if (oneDecimal.endsWith(".0")) {
    return String(Math.round(p));
  }
  return oneDecimal.replace(".", ",");
}

const OVERVIEW_FIT_OPTS = { padding: [32, 32] as L.PointTuple, maxZoom: 10 };
/** Desktop (md+): w-80 (20rem) + marge; el mòbil usa meitat inferior del mapa com a sheet. */
const SELECTED_PADDING_BOTTOM_RIGHT_DESKTOP: L.PointTuple = [352, 40];

function isMdViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches
  );
}

/** Per assignar a `cancelled` als cleanups d'useEffect (literal estable). */
const EFFECT_CANCELLED = true;

function MapResizeInvalidator(): null {
  const map = useMap();
  useEffect(() => {
    const invalidate = (): void => {
      map.invalidateSize();
    };
    window.addEventListener("resize", invalidate);
    const container = map.getContainer();
    const ro = new ResizeObserver(invalidate);
    ro.observe(container);
    const t = window.setTimeout(invalidate, 0);
    return () => {
      window.removeEventListener("resize", invalidate);
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [map]);
  return null;
}

function MapViewToSelection({
  data,
  overviewBounds,
  selectedId,
}: {
  data: FeatureCollection;
  overviewBounds: L.LatLngBounds;
  selectedId: string | null;
}): null {
  const map = useMap();

  useEffect(() => {
    const fitSelected = (): void => {
      if (selectedId === null || selectedId.length === 0) {
        return;
      }
      const featureBounds = boundsForSelectedMunicipality(data, selectedId);
      if (featureBounds === null) {
        return;
      }
      const h = map.getContainer().clientHeight;
      const paddingBottomRight: L.PointTuple = isMdViewport()
        ? SELECTED_PADDING_BOTTOM_RIGHT_DESKTOP
        : [16, Math.max(48, Math.round(h * 0.5) + 16)];
      map.fitBounds(featureBounds, {
        paddingTopLeft: [32, 32],
        paddingBottomRight,
        maxZoom: 17,
      });
    };

    if (selectedId !== null && selectedId.length > 0) {
      const featureBounds = boundsForSelectedMunicipality(data, selectedId);
      if (featureBounds !== null) {
        fitSelected();
        const onResize = (): void => {
          fitSelected();
        };
        window.addEventListener("resize", onResize);
        return () => {
          window.removeEventListener("resize", onResize);
        };
      }
    }

    if (overviewBounds.isValid()) {
      map.fitBounds(overviewBounds, OVERVIEW_FIT_OPTS);
    }
    return undefined;
  }, [data, map, overviewBounds, selectedId]);

  return null;
}

export default function Map(): React.ReactElement {
  const { data: session } = useAuth();
  const userId = session?.user?.id;
  const userPlan = session?.user?.plan ?? "FREE";
  const mapTileHint = useOfflineSync((s) => s.mapTileHint);
  const triggerSync = useOfflineSync((s) => s.triggerSync);
  const syncPhase = useOfflineSync((s) => s.phase);
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});
  const [geoKeyTick, setGeoKeyTick] = useState(0);
  const [comarcaMap, setComarcaMap] = useState<MunicipiComarcaMap | null>(null);

  const municipalitiesNonce = useMunicipalities((s) => s.municipalitiesNonce);
  const selected = useMunicipalities((s) => s.selected);
  const setSelectedMunicipality = useMunicipalities(
    (s) => s.setSelectedMunicipality,
  );
  const showOsmTiles = useMapBasemap((s) => s.showOsmTiles);
  const toggleOsmTiles = useMapBasemap((s) => s.toggleOsmTiles);
  const showComarcaOutlines = useMapBasemap((s) => s.showComarcaOutlines);
  const toggleComarcaOutlines = useMapBasemap(
    (s) => s.toggleComarcaOutlines,
  );
  const [comarquesData, setComarquesData] =
    useState<FeatureCollection | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async (): Promise<void> => {
      try {
        const res = await fetch("/data/catalunya-municipis.geojson");
        if (!res.ok) {
          throw new Error(`HTTP ${String(res.status)}`);
        }
        const json: unknown = await res.json();
        if (cancelled) {
          return;
        }
        if (!isFeatureCollection(json)) {
          throw new Error("El fitxer no és un FeatureCollection vàlid");
        }
        const polys = filterMunicipalityPolygonFeatures(json);
        setData(normalizeCatalunyaFeatureCollectionProjection(polys));
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Error desconegut carregant el mapa",
          );
        }
      }
    })();

    return () => {
      cancelled = EFFECT_CANCELLED;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async (): Promise<void> => {
      try {
        const res = await fetch("/data/municipi-comarca.json");
        if (!res.ok) {
          if (!cancelled) {
            setComarcaMap({});
          }
          return;
        }
        const json: unknown = await res.json();
        if (cancelled) {
          return;
        }
        if (isMunicipiComarcaMap(json)) {
          setComarcaMap(json);
        }
      } catch {
        if (!cancelled) {
          setComarcaMap({});
        }
      }
    })();

    return () => {
      cancelled = EFFECT_CANCELLED;
    };
  }, []);

  useEffect(() => {
    if (!showComarcaOutlines) {
      return;
    }
    if (comarquesData !== null) {
      return;
    }

    let cancelled = false;

    void (async (): Promise<void> => {
      try {
        const res = await fetch("/data/catalunya-comarques.geojson");
        if (!res.ok) {
          return;
        }
        const json: unknown = await res.json();
        if (cancelled) {
          return;
        }
        if (isFeatureCollection(json)) {
          setComarquesData(json);
        }
      } catch {
        /* capa opcional */
      }
    })();

    return () => {
      cancelled = EFFECT_CANCELLED;
    };
  }, [showComarcaOutlines, comarquesData]);

  useEffect(() => {
    let cancelled = false;

    void (async (): Promise<void> => {
      const countsFromList = (list: unknown): Record<string, number> => {
        const counts: Record<string, number> = {};
        if (!Array.isArray(list)) {
          return counts;
        }
        for (const item of list) {
          const id = municipalityIdFromApiItem(item);
          if (id === null) {
            continue;
          }
          counts[id] = parseVisitCount(
            (item as { visitCount?: unknown }).visitCount,
          );
        }
        return counts;
      };

      try {
        const res = await apiFetch("/api/municipalities");
        if (!res.ok) {
          throw new Error(`API municipis HTTP ${String(res.status)}`);
        }
        const list: unknown = await res.json();
        if (cancelled) {
          return;
        }
        if (!Array.isArray(list)) {
          throw new Error("Resposta municipis invàlida");
        }
        if (typeof userId === "string") {
          await saveMunicipalitiesSnapshot(userId, list);
        }
        let counts = countsFromList(list);
        if (typeof userId === "string") {
          counts = await mergeOutboxVisitCountsInto(userId, counts);
        }
        setVisitCounts(counts);
        setGeoKeyTick((t) => t + 1);
      } catch {
        if (cancelled) {
          return;
        }
        let counts: Record<string, number> = {};
        if (typeof userId === "string") {
          const snap = await loadMunicipalitiesSnapshot(userId);
          counts = countsFromList(snap);
          counts = await mergeOutboxVisitCountsInto(userId, counts);
        }
        setVisitCounts(counts);
        setGeoKeyTick((t) => t + 1);
      }
    })();

    return () => {
      cancelled = EFFECT_CANCELLED;
    };
  }, [municipalitiesNonce, userId]);

  const bounds = useMemo((): L.LatLngBounds | null => {
    if (data === null) {
      return null;
    }
    return L.geoJSON(data).getBounds();
  }, [data]);

  const visitSignature = useMemo(
    () =>
      Object.entries(visitCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${String(v)}`)
        .join("|"),
    [visitCounts],
  );

  const municipalityVisitStats = useMemo(() => {
    if (data === null) {
      return null;
    }
    let total = 0;
    let visited = 0;
    for (const feature of data.features) {
      const m = getMunicipalityFromPolygonFeature(feature);
      if (m === null) {
        continue;
      }
      total += 1;
      if (visitCountForMunicipalityId(visitCounts, m.id) > 0) {
        visited += 1;
      }
    }
    const percentLabel = formatMunicipalityVisitPercentLabel(visited, total);
    return { total, visited, percentLabel };
  }, [data, visitCounts]);

  const geoJsonKey = `${String(geoKeyTick)}|${visitSignature}|${selected?.id ?? ""}|c:${comarcaMap === null ? "0" : "1"}`;

  const geoJsonStyle = (
    feature?: Feature<Geometry, GeoJsonProperties>,
  ): PathOptions => {
    if (feature === undefined) {
      return {
        fill: true,
        color: "#64748b",
        weight: 1,
        opacity: 1,
        fillColor: "#e2e8f0",
        fillOpacity: 0.28,
      };
    }
    const m = getMunicipalityFromPolygonFeature(feature);
    if (m === null) {
      return {
        fill: true,
        color: "#64748b",
        weight: 1,
        opacity: 1,
        fillColor: "#e2e8f0",
        fillOpacity: 0.28,
      };
    }
    const visitCount = visitCountForMunicipalityId(visitCounts, m.id);
    const comarca =
      comarcaMap !== null ? findComarcaForMunicipalityId(comarcaMap, m.id) : null;
    return polygonMunicipalityStyle({
      munId: m.id,
      visitCount,
      selectedId: selected?.id ?? null,
      hoveredId: null,
      comarcaCode: comarca?.comarcaCode ?? null,
    });
  };

  const onEachFeature = (
    feature: Feature<Geometry, GeoJsonProperties>,
    layer: Layer,
  ): void => {
    const m = getMunicipalityFromPolygonFeature(feature);
    if (m === null) {
      return;
    }
    if (!(layer instanceof L.Path)) {
      return;
    }
    const pathLayer = layer;

    const applyCurrentStyle = (hoveredId: string | null): void => {
      const visitCount = visitCountForMunicipalityId(visitCounts, m.id);
      const sel = useMunicipalities.getState().selected;
      const mapState = comarcaMap;
      const comarca =
        mapState !== null ? findComarcaForMunicipalityId(mapState, m.id) : null;
      pathLayer.setStyle(
        polygonMunicipalityStyle({
          munId: m.id,
          visitCount,
          selectedId: sel?.id ?? null,
          hoveredId,
          comarcaCode: comarca?.comarcaCode ?? null,
        }),
      );
    };

    pathLayer.on({
      click: () => {
        setSelectedMunicipality({ id: m.id, name: m.name });
      },
      mouseover: () => {
        applyCurrentStyle(m.id);
      },
      mouseout: () => {
        applyCurrentStyle(null);
      },
    });
  };

  if (loadError !== null) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center bg-zinc-100 p-4 text-red-700">
        {loadError}
      </div>
    );
  }

  if (data === null || bounds === null) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center bg-zinc-100 text-zinc-600">
        Carregant municipis…
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-3rem)] min-h-[calc(100dvh-3rem)] w-full">
      {municipalityVisitStats !== null ? (
        <div
          className="pointer-events-none absolute top-3 right-4 left-4 z-[500] flex flex-col items-center gap-2 px-2"
          aria-live="polite"
        >
          <p className="pointer-events-auto mx-auto max-w-md rounded-lg border border-zinc-200/90 bg-white/95 px-4 py-2 text-center text-sm font-medium text-zinc-800 shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-100">
            <span className="tabular-nums">
              {municipalityVisitStats.visited}
            </span>
            {" visitats de "}
            <span className="tabular-nums">
              {municipalityVisitStats.total}
            </span>
            {" ("}
            <span className="tabular-nums">
              {municipalityVisitStats.percentLabel}
            </span>
            %)
          </p>
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span>
              Mapa:{" "}
              {mapTileHint === "offline_no_network"
                ? "sense xarxa (tiles en cache si n’hi ha)"
                : "en línia"}
            </span>
            {typeof userId === "string" ? (
              <button
                type="button"
                className="rounded border border-zinc-300 bg-white/90 px-2 py-1 font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
                disabled={syncPhase === "syncing"}
                onClick={() => {
                  void triggerSync(userId, userPlan);
                }}
              >
                {syncPhase === "syncing"
                  ? "Sincronitzant…"
                  : "Sincronitzar ara"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <MapContainer
        center={[41.5912, 1.5209]}
        zoom={8}
        className={
          showOsmTiles
            ? "h-full min-h-0 w-full"
            : "h-full min-h-0 w-full bg-zinc-100 dark:bg-zinc-950"
        }
        scrollWheelZoom
      >
        {showOsmTiles ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : null}
        <MapResizeInvalidator />
        <MapViewToSelection
          data={data}
          overviewBounds={bounds}
          selectedId={selected?.id ?? null}
        />
        <GeoJSON
          key={geoJsonKey}
          data={data}
          style={geoJsonStyle}
          onEachFeature={onEachFeature}
        />
        {showComarcaOutlines && comarquesData !== null ? (
          <GeoJSON
            data={comarquesData}
            interactive={false}
            style={{
              fill: false,
              fillOpacity: 0,
              weight: 2,
              opacity: 0.9,
              color: "#334155",
            }}
          />
        ) : null}
      </MapContainer>
      <div
        className={
          selected !== null
            ? "absolute bottom-[calc(50dvh+0.75rem)] left-4 z-[500] flex flex-col gap-2 md:bottom-4"
            : "absolute bottom-4 left-4 z-[500] flex flex-col gap-2"
        }
      >
        <button
          type="button"
          onClick={() => {
            toggleOsmTiles();
          }}
          className="rounded-md border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-medium text-zinc-800 shadow-md backdrop-blur hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100 dark:hover:bg-zinc-800"
          aria-pressed={showOsmTiles}
        >
          {showOsmTiles ? "Només municipis" : "Mapa OSM"}
        </button>
        <button
          type="button"
          onClick={() => {
            toggleComarcaOutlines();
          }}
          className="rounded-md border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-medium text-zinc-800 shadow-md backdrop-blur hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100 dark:hover:bg-zinc-800"
          aria-pressed={showComarcaOutlines}
        >
          {showComarcaOutlines ? "Amaga comarques" : "Veure comarques"}
        </button>
      </div>
    </div>
  );
}
