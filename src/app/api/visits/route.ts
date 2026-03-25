import "reflect-metadata";

import { MediaType } from "@prisma/client";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { VisitCreator } from "@/contexts/geo-journal/visits/application/create/VisitCreator";
import { VisitsByMunicipalitySearcher } from "@/contexts/geo-journal/visits/application/search-by-municipality/VisitsByMunicipalitySearcher";
import { MunicipalityNotFoundError } from "@/contexts/geo-journal/visits/domain/MunicipalityNotFoundError";
import type { CreateVisitInput } from "@/contexts/geo-journal/visits/domain/CreateVisitInput";
import { container } from "@/contexts/shared/infrastructure/dependency-injection/diod.config";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import type { CreateVisitBody } from "@/types/api";

function isMediaType(value: unknown): value is MediaType {
  return value === MediaType.image || value === MediaType.link;
}

function parseCreateVisitBody(
  body: unknown,
): Omit<CreateVisitInput, "userId"> | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const b = body as CreateVisitBody;
  if (typeof b.municipalityId !== "string" || b.municipalityId.length === 0) {
    return null;
  }
  if (typeof b.visitedAt !== "string" || b.visitedAt.length === 0) {
    return null;
  }

  const visitedAt = new Date(b.visitedAt);
  if (Number.isNaN(visitedAt.getTime())) {
    return null;
  }

  let notes: string | null | undefined = undefined;
  if (b.notes !== undefined) {
    if (b.notes !== null && typeof b.notes !== "string") {
      return null;
    }
    notes = b.notes;
  }

  const mediaRaw = b.media;
  const media: CreateVisitInput["media"] = [];
  if (mediaRaw !== undefined) {
    if (!Array.isArray(mediaRaw)) {
      return null;
    }
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
  }

  return {
    municipalityId: b.municipalityId,
    visitedAt,
    notes,
    media,
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const municipalityId = request.nextUrl.searchParams.get("municipalityId");
  if (!municipalityId) {
    return HttpNextResponse.json(
      { error: "Query parameter municipalityId is required" },
      { status: 400 },
    );
  }

  const visits = await container
    .get(VisitsByMunicipalitySearcher)
    .search(municipalityId, session.user.id);
  return HttpNextResponse.json(visits);
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return HttpNextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseCreateVisitBody(json);
  if (!parsed) {
    return HttpNextResponse.json(
      {
        error:
          "Invalid body: expected municipalityId, visitedAt (ISO date), optional notes, optional media[]",
      },
      { status: 400 },
    );
  }

  try {
    const visit = await container.get(VisitCreator).create({
      ...parsed,
      userId: session.user.id,
    });
    return HttpNextResponse.json(visit, { status: 201 });
  } catch (error) {
    if (error instanceof MunicipalityNotFoundError) {
      return HttpNextResponse.json(
        { error: "Municipality not found" },
        { status: 404 },
      );
    }
    throw error;
  }
}
