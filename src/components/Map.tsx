"use client";

import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import L from "leaflet";
import type { Layer, PathOptions } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";

import {
  filterMunicipalityPolygonFeatures,
  getMunicipalityFromPolygonFeature,
  normalizeCatalunyaFeatureCollectionProjection,
  polygonMunicipalityStyle,
} from "@/lib/catalunyaGeoJson";
import { useMunicipalities } from "@/store/useMunicipalities";

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

function FitBounds({ bounds }: { bounds: L.LatLngBounds }): null {
  const map = useMap();

  useEffect(() => {
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 10 });
    }
  }, [bounds, map]);

  return null;
}

export default function Map(): React.ReactElement {
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});
  const [geoKeyTick, setGeoKeyTick] = useState(0);

  const municipalitiesNonce = useMunicipalities((s) => s.municipalitiesNonce);
  const selected = useMunicipalities((s) => s.selected);
  const setSelectedMunicipality = useMunicipalities(
    (s) => s.setSelectedMunicipality,
  );

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
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async (): Promise<void> => {
      try {
        const res = await fetch("/api/municipalities");
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
        const counts: Record<string, number> = {};
        for (const item of list) {
          const id = municipalityIdFromApiItem(item);
          if (id === null) {
            continue;
          }
          counts[id] = parseVisitCount(
            (item as { visitCount?: unknown }).visitCount,
          );
        }
        setVisitCounts(counts);
        setGeoKeyTick((t) => t + 1);
      } catch {
        if (!cancelled) {
          setVisitCounts({});
          setGeoKeyTick((t) => t + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [municipalitiesNonce]);

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

  const geoJsonKey = `${String(geoKeyTick)}|${visitSignature}|${selected?.id ?? ""}`;

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
    return polygonMunicipalityStyle({
      munId: m.id,
      visitCount,
      selectedId: selected?.id ?? null,
      hoveredId: null,
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
      pathLayer.setStyle(
        polygonMunicipalityStyle({
          munId: m.id,
          visitCount,
          selectedId: sel?.id ?? null,
          hoveredId,
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
      <div className="flex h-screen items-center justify-center bg-zinc-100 p-4 text-red-700">
        {loadError}
      </div>
    );
  }

  if (data === null || bounds === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-100 text-zinc-600">
        Carregant municipis…
      </div>
    );
  }

  return (
    <MapContainer
      center={[41.5912, 1.5209]}
      zoom={8}
      className="h-screen w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds bounds={bounds} />
      <GeoJSON
        key={geoJsonKey}
        data={data}
        style={geoJsonStyle}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}
