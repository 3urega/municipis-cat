import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";
import { parseVisitJson } from "@/lib/visitListJson";
import type { PendingVisitRow } from "@/lib/offline/visitsDb";
import { getVisitsOfflineDb } from "@/lib/offline/visitsDb";

function isLikelyNetworkError(e: unknown): boolean {
  if (e instanceof TypeError) {
    return true;
  }
  if (e instanceof Error && e.name === "AbortError") {
    return true;
  }
  if (
    typeof DOMException !== "undefined" &&
    e instanceof DOMException &&
    (e.name === "NetworkError" || e.name === "AbortError")
  ) {
    return true;
  }
  if (e instanceof Error && /failed to fetch|load failed|networkerror/i.test(e.message)) {
    return true;
  }
  return false;
}

export type CreateVisitOfflineFirstInput = {
  municipalityId: string;
  visitedAt: string;
  notes?: string | null;
};

export type CreateVisitOfflineFirstResult =
  | { ok: true; kind: "remote"; visit: VisitWithMediaPrimitives }
  | { ok: true; kind: "queued"; visit: VisitWithMediaPrimitives }
  | { ok: false; error: "http"; status: number; message: string }
  | { ok: false; error: "parse" }
  | { ok: false; error: "auth" }
  | { ok: false; error: "storage"; message: string };

export async function createVisitOfflineFirst(
  userId: string,
  input: CreateVisitOfflineFirstInput,
): Promise<CreateVisitOfflineFirstResult> {
  const body = {
    municipalityId: input.municipalityId,
    visitedAt: input.visitedAt,
    notes:
      input.notes !== undefined &&
      input.notes !== null &&
      input.notes.trim().length > 0
        ? input.notes.trim()
        : undefined,
  };

  const tryRemote = async (): Promise<CreateVisitOfflineFirstResult | null> => {
    let res: Response;
    try {
      res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (isLikelyNetworkError(e)) {
        return null;
      }
      throw e;
    }

    if (res.status === 401) {
      return { ok: false, error: "auth" };
    }

    if (res.status === 404) {
      return {
        ok: false,
        error: "http",
        status: 404,
        message: "Municipi no trobat a la base de dades.",
      };
    }

    if (!res.ok) {
      const errJson: unknown = await res.json().catch(() => null);
      const msg =
        typeof errJson === "object" &&
        errJson !== null &&
        typeof (errJson as { error?: unknown }).error === "string"
          ? (errJson as { error: string }).error
          : `Error HTTP ${String(res.status)}`;
      return { ok: false, error: "http", status: res.status, message: msg };
    }

    const json: unknown = await res.json();
    const created = parseVisitJson(json);
    if (created === null) {
      return { ok: false, error: "parse" };
    }
    return { ok: true, kind: "remote", visit: created };
  };

  if (typeof navigator !== "undefined" && navigator.onLine) {
    const remote = await tryRemote();
    if (remote !== null) {
      return remote;
    }
  }

  const id = crypto.randomUUID();
  const notesVal =
    body.notes !== undefined ? body.notes : null;
  const row: PendingVisitRow = {
    id,
    userId,
    municipalityId: input.municipalityId,
    visitedAt: input.visitedAt,
    notes: notesVal,
    pendingAction: "create",
    serverVisitId: null,
  };

  try {
    await getVisitsOfflineDb().pendingVisits.put(row);
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "No s’ha pogut desar la visita fora de línia (emmagatzematge local).";
    return {
      ok: false,
      error: "storage",
      message: msg.length > 0 ? msg : "Emmagatzematge local no disponible.",
    };
  }
  const visit: VisitWithMediaPrimitives = {
    id: row.id,
    municipalityId: row.municipalityId,
    visitedAt: row.visitedAt,
    notes: row.notes,
    media: [],
  };
  return { ok: true, kind: "queued", visit };
}
