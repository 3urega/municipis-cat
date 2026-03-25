import { MediaType } from "@prisma/client";

import type { CreateVisitMediaBody } from "@/types/api";

export function isMediaType(value: unknown): value is MediaType {
  return value === MediaType.image || value === MediaType.link;
}

export function parseMediaBodyArray(
  mediaRaw: unknown,
): CreateVisitMediaBody[] | null {
  if (mediaRaw === undefined) {
    return [];
  }
  if (!Array.isArray(mediaRaw)) {
    return null;
  }
  const media: CreateVisitMediaBody[] = [];
  for (const item of mediaRaw) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const m = item as { type?: unknown; url?: unknown };
    if (
      !isMediaType(m.type) ||
      typeof m.url !== "string" ||
      m.url.length === 0
    ) {
      return null;
    }
    media.push({ type: m.type, url: m.url });
  }
  return media;
}

export function parseUpdateVisitBody(body: unknown): {
  notes?: string | null;
  visitedAt?: Date;
  media?: CreateVisitMediaBody[];
} | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const b = body as Record<string, unknown>;
  const out: {
    notes?: string | null;
    visitedAt?: Date;
    media?: CreateVisitMediaBody[];
  } = {};

  if ("notes" in b) {
    if (b.notes !== null && typeof b.notes !== "string") {
      return null;
    }
    out.notes = b.notes as string | null;
  }
  if ("visitedAt" in b) {
    if (typeof b.visitedAt !== "string" || b.visitedAt.length === 0) {
      return null;
    }
    const visitedAt = new Date(b.visitedAt);
    if (Number.isNaN(visitedAt.getTime())) {
      return null;
    }
    out.visitedAt = visitedAt;
  }
  if ("media" in b) {
    const parsed = parseMediaBodyArray(b.media);
    if (parsed === null) {
      return null;
    }
    out.media = parsed;
  }
  return out;
}
