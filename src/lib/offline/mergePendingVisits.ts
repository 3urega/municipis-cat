import type { UserPlanLiteral } from "@/lib/auth/appAuthTypes";
import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";

import type { PendingVisitRow } from "@/lib/offline/visitsDb";
import {
  getFreeLocalImageCountByVisitKey,
  getUnsyncedPendingImageCountByLocalVisitId,
  getVisitsOfflineDb,
} from "@/lib/offline/visitsDb";

export type VisitWithOfflineMeta = VisitWithMediaPrimitives & {
  offlinePending?: boolean;
  offlinePendingImageCount?: number;
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

/** @deprecated Usar buildMergedVisitsList */
export async function listPendingVisitsForMunicipality(
  userId: string,
  municipalityId: string,
): Promise<VisitWithMediaPrimitives[]> {
  const rows = await getVisitsOfflineDb()
    .pendingVisits.where("userId")
    .equals(userId)
    .filter(
      (r) =>
        r.municipalityId === municipalityId && r.pendingAction === "create",
    )
    .toArray();
  return rows.map(pendingRowToVisit);
}

export async function listAllPendingCreatesForUser(
  userId: string,
): Promise<VisitWithMediaPrimitives[]> {
  const rows = await getVisitsOfflineDb()
    .pendingVisits.where("userId")
    .equals(userId)
    .filter((r) => r.pendingAction === "create")
    .toArray();
  return rows.map(pendingRowToVisit);
}

/** Alias amb nom antic (explorer). */
export const listAllPendingVisitsForUser = listAllPendingCreatesForUser;

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

function imageCountForVisit(
  imgCounts: Map<string, number>,
  visitId: string,
): number {
  return imgCounts.get(visitId) ?? 0;
}

export async function buildMergedVisitsList(
  userId: string,
  municipalityId: string,
  apiVisits: VisitWithMediaPrimitives[],
  plan: UserPlanLiteral,
): Promise<VisitWithOfflineMeta[]> {
  const [rows, premiumPendingCounts, freeLocalCounts] = await Promise.all([
    getVisitsOfflineDb().pendingVisits.where("userId").equals(userId).toArray(),
    plan === "PREMIUM"
      ? getUnsyncedPendingImageCountByLocalVisitId(userId)
      : Promise.resolve(new Map<string, number>()),
    plan === "FREE"
      ? getFreeLocalImageCountByVisitKey(userId)
      : Promise.resolve(new Map<string, number>()),
  ]);

  const deletes = new Set(
    rows.filter((r) => r.pendingAction === "delete").map((r) => r.id),
  );
  const updates = new Map(
    rows.filter((r) => r.pendingAction === "update").map((r) => [r.id, r]),
  );
  const creates = rows.filter(
    (r) =>
      r.pendingAction === "create" && r.municipalityId === municipalityId,
  );

  const merged: VisitWithOfflineMeta[] = [];

  for (const v of apiVisits) {
    if (deletes.has(v.id)) {
      continue;
    }
    const u = updates.get(v.id);
    const imgCount =
      plan === "PREMIUM"
        ? imageCountForVisit(premiumPendingCounts, v.id)
        : imageCountForVisit(freeLocalCounts, v.id);
    const pendingFlag =
      u !== undefined || (plan === "PREMIUM" && imgCount > 0);
    merged.push({
      ...(u !== undefined
        ? {
            ...v,
            visitedAt: u.visitedAt,
            notes: u.notes,
          }
        : v),
      offlinePending: pendingFlag,
      offlinePendingImageCount:
        plan === "PREMIUM" && imgCount > 0
          ? imgCount
          : plan === "FREE" && imgCount > 0
            ? imgCount
            : undefined,
    });
  }

  for (const c of creates) {
    const imgCount =
      plan === "PREMIUM"
        ? imageCountForVisit(premiumPendingCounts, c.id)
        : imageCountForVisit(freeLocalCounts, c.id);
    merged.push({
      ...pendingRowToVisit(c),
      offlinePending: true,
      offlinePendingImageCount:
        imgCount > 0 ? imgCount : undefined,
    });
  }

  merged.sort(
    (a, b) =>
      new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
  );
  return merged;
}

export async function buildMergedVisitsListAll(
  userId: string,
  apiVisits: VisitWithMediaPrimitives[],
  plan: UserPlanLiteral,
): Promise<VisitWithOfflineMeta[]> {
  const [rows, premiumPendingCounts, freeLocalCounts] = await Promise.all([
    getVisitsOfflineDb().pendingVisits.where("userId").equals(userId).toArray(),
    plan === "PREMIUM"
      ? getUnsyncedPendingImageCountByLocalVisitId(userId)
      : Promise.resolve(new Map<string, number>()),
    plan === "FREE"
      ? getFreeLocalImageCountByVisitKey(userId)
      : Promise.resolve(new Map<string, number>()),
  ]);

  const deletes = new Set(
    rows.filter((r) => r.pendingAction === "delete").map((r) => r.id),
  );
  const updates = new Map(
    rows.filter((r) => r.pendingAction === "update").map((r) => [r.id, r]),
  );
  const creates = rows.filter((r) => r.pendingAction === "create");

  const merged: VisitWithOfflineMeta[] = [];

  for (const v of apiVisits) {
    if (deletes.has(v.id)) {
      continue;
    }
    const u = updates.get(v.id);
    const imgCount =
      plan === "PREMIUM"
        ? imageCountForVisit(premiumPendingCounts, v.id)
        : imageCountForVisit(freeLocalCounts, v.id);
    const pendingFlag =
      u !== undefined || (plan === "PREMIUM" && imgCount > 0);
    merged.push({
      ...(u !== undefined
        ? {
            ...v,
            visitedAt: u.visitedAt,
            notes: u.notes,
          }
        : v),
      offlinePending: pendingFlag,
      offlinePendingImageCount:
        plan === "PREMIUM" && imgCount > 0
          ? imgCount
          : plan === "FREE" && imgCount > 0
            ? imgCount
            : undefined,
    });
  }

  for (const c of creates) {
    const imgCount =
      plan === "PREMIUM"
        ? imageCountForVisit(premiumPendingCounts, c.id)
        : imageCountForVisit(freeLocalCounts, c.id);
    merged.push({
      ...pendingRowToVisit(c),
      offlinePending: true,
      offlinePendingImageCount:
        imgCount > 0 ? imgCount : undefined,
    });
  }

  merged.sort(
    (a, b) =>
      new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
  );
  return merged;
}
