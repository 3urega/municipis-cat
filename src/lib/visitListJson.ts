import { MediaType } from "@prisma/client";

import type { VisitMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitMediaPrimitives";
import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";

function isMediaRow(value: unknown): value is VisitMediaPrimitives {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    (m.type === MediaType.image || m.type === MediaType.link) &&
    typeof m.url === "string"
  );
}

export function parseVisitJson(json: unknown): VisitWithMediaPrimitives | null {
  return normalizeVisitRow(json);
}

function normalizeVisitRow(value: unknown): VisitWithMediaPrimitives | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const o = value as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.municipalityId !== "string" ||
    typeof o.visitedAt !== "string"
  ) {
    return null;
  }

  const notes =
    typeof o.notes === "string"
      ? o.notes
      : o.notes === null || o.notes === undefined
        ? null
        : null;

  let media: VisitMediaPrimitives[] = [];
  if (Array.isArray(o.media)) {
    media = o.media.filter(isMediaRow);
  }

  return {
    id: o.id,
    municipalityId: o.municipalityId,
    visitedAt: o.visitedAt,
    notes,
    media,
  };
}

export function parseVisitListJson(json: unknown): VisitWithMediaPrimitives[] {
  if (!Array.isArray(json)) {
    return [];
  }
  const out: VisitWithMediaPrimitives[] = [];
  for (const item of json) {
    const row = normalizeVisitRow(item);
    if (row !== null) {
      out.push(row);
    }
  }
  return out;
}
