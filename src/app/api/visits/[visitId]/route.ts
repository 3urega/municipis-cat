import "reflect-metadata";

import { auth } from "@/auth";
import { VisitFinder } from "@/contexts/geo-journal/visits/application/find/VisitFinder";
import { VisitRemover } from "@/contexts/geo-journal/visits/application/remove/VisitRemover";
import { VisitUpdater } from "@/contexts/geo-journal/visits/application/update/VisitUpdater";
import { VisitNotFoundError } from "@/contexts/geo-journal/visits/domain/VisitNotFoundError";
import { container } from "@/contexts/shared/infrastructure/dependency-injection/diod.config";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { parseUpdateVisitBody } from "@/lib/visitApiBodyParse";

type RouteContext = { params: Promise<{ visitId: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { visitId } = await context.params;
  if (visitId.length === 0) {
    return HttpNextResponse.json({ error: "Invalid visit id" }, { status: 400 });
  }

  try {
    const visit = await container
      .get(VisitFinder)
      .find(visitId, session.user.id);
    return HttpNextResponse.json(visit);
  } catch (error) {
    if (error instanceof VisitNotFoundError) {
      return HttpNextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { visitId } = await context.params;
  if (visitId.length === 0) {
    return HttpNextResponse.json({ error: "Invalid visit id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return HttpNextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseUpdateVisitBody(json);
  if (parsed === null) {
    return HttpNextResponse.json(
      {
        error:
          "Invalid body: optional notes, visitedAt (ISO date), optional media[]",
      },
      { status: 400 },
    );
  }

  try {
    const visit = await container.get(VisitUpdater).update({
      visitId,
      userId: session.user.id,
      ...parsed,
    });
    return HttpNextResponse.json(visit);
  } catch (error) {
    if (error instanceof VisitNotFoundError) {
      return HttpNextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { visitId } = await context.params;
  if (visitId.length === 0) {
    return HttpNextResponse.json({ error: "Invalid visit id" }, { status: 400 });
  }

  try {
    await container
      .get(VisitRemover)
      .remove(visitId, session.user.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof VisitNotFoundError) {
      return HttpNextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    throw error;
  }
}
