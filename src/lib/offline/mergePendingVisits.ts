import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";

import type { PendingVisitRow } from "@/lib/offline/visitsDb";
import { getVisitsOfflineDb } from "@/lib/offline/visitsDb";

export type VisitWithOfflineMeta = VisitWithMediaPrimitives & {
  offlinePending?: boolean;
};

export function pendingRowToVisit(row: PendingVisitRow): VisitWithMediaPrimitives {
  return {
    id: row.id,
    municipalityId: row.municipalityId,
    visitedAt: row.visitedAt,
    notes: row.notes,
    media: [],
  };
}

export async function listPendingVisitsForMunicipality(
  userId: string,
  municipalityId: string,
): Promise<VisitWithMediaPrimitives[]> {
  const rows = await getVisitsOfflineDb()
    .pendingVisits.where("userId")
    .equals(userId)
    .filter(
      (r) =>
        r.municipalityId === municipalityId &&
        !r.synced &&
        r.pendingAction === "create",
    )
    .toArray();
  return rows.map(pendingRowToVisit);
}

export async function listAllPendingVisitsForUser(
  userId: string,
): Promise<VisitWithMediaPrimitives[]> {
  const rows = await getVisitsOfflineDb()
    .pendingVisits.where("userId")
    .equals(userId)
    .filter((r) => !r.synced && r.pendingAction === "create")
    .toArray();
  return rows.map(pendingRowToVisit);
}

/** Fusiona API + pendents, ordenat per visitedAt desc. Els pendents marquen offlinePending. */
export function mergeVisitsLists(
  apiVisits: VisitWithMediaPrimitives[],
  pending: VisitWithMediaPrimitives[],
): VisitWithOfflineMeta[] {
  const apiIds = new Set(apiVisits.map((v) => v.id));
  const pendingFiltered = pending.filter((p) => !apiIds.has(p.id));
  const merged: VisitWithOfflineMeta[] = [
    ...apiVisits.map((v) => ({ ...v, offlinePending: false })),
    ...pendingFiltered.map((v) => ({ ...v, offlinePending: true })),
  ];
  merged.sort(
    (a, b) =>
      new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
  );
  return merged;
}
