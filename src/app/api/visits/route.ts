import "reflect-metadata";

import type { NextRequest } from "next/server";

import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { VisitCreator } from "@/contexts/geo-journal/visits/application/create/VisitCreator";
import { VisitsByMunicipalitySearcher } from "@/contexts/geo-journal/visits/application/search-by-municipality/VisitsByMunicipalitySearcher";
import { FreePlanMunicipalityLimitExceededError } from "@/contexts/geo-journal/visits/domain/FreePlanMunicipalityLimitExceededError";
import type { CreateVisitInput } from "@/contexts/geo-journal/visits/domain/CreateVisitInput";
import { MunicipalityNotFoundError } from "@/contexts/geo-journal/visits/domain/MunicipalityNotFoundError";
import { UserImageLimitExceededError } from "@/contexts/geo-journal/visits/domain/UserImageLimitExceededError";
import {
  FREE_PLAN_MUNICIPALITY_LIMIT_EXCEEDED_CODE,
  USER_IMAGE_LIMIT_EXCEEDED_CODE,
} from "@/lib/storage/planLimitConstants";
import { container } from "@/contexts/shared/infrastructure/dependency-injection/diod.config";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { parseMediaBodyArray } from "@/lib/visitApiBodyParse";
import type { CreateVisitBody } from "@/types/api";

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
  let media: CreateVisitInput["media"];
  if (mediaRaw === undefined) {
    media = [];
  } else {
    const parsedMedia = parseMediaBodyArray(mediaRaw);
    if (parsedMedia === null) {
      return null;
    }
    media = parsedMedia;
  }

  return {
    municipalityId: b.municipalityId,
    visitedAt,
    notes,
    media,
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const user = await resolveAuthUser(request);
  if (user === null) {
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
    .search(municipalityId, user.id);
  return HttpNextResponse.json(visits);
}

export async function POST(request: NextRequest): Promise<Response> {
  const user = await resolveAuthUser(request);
  if (user === null) {
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
      userId: user.id,
    });
    return HttpNextResponse.json(visit, { status: 201 });
  } catch (error) {
    if (error instanceof MunicipalityNotFoundError) {
      return HttpNextResponse.json(
        { error: "Municipality not found" },
        { status: 404 },
      );
    }
    if (error instanceof FreePlanMunicipalityLimitExceededError) {
      return HttpNextResponse.json(
        {
          error: error.message,
          code: FREE_PLAN_MUNICIPALITY_LIMIT_EXCEEDED_CODE,
        },
        { status: 403 },
      );
    }
    if (error instanceof UserImageLimitExceededError) {
      return HttpNextResponse.json(
        {
          error: error.message,
          code: USER_IMAGE_LIMIT_EXCEEDED_CODE,
        },
        { status: 403 },
      );
    }
    throw error;
  }
}
