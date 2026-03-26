import { getVisitsOfflineDb } from "@/lib/offline/visitsDb";

/** Ajusta comptadors per municipi segons creates / deletes pendents a l’outbox. */
export async function mergeOutboxVisitCountsInto(
  userId: string,
  counts: Record<string, number>,
): Promise<Record<string, number>> {
  const rows = await getVisitsOfflineDb()
    .pendingVisits.where("userId")
    .equals(userId)
    .toArray();
  const out: Record<string, number> = { ...counts };
  for (const r of rows) {
    if (r.pendingAction === "delete") {
      const mid = r.municipalityId;
      if (mid.length > 0) {
        out[mid] = Math.max(0, (out[mid] ?? 0) - 1);
      }
      continue;
    }
    if (r.pendingAction === "create") {
      const mid = r.municipalityId;
      out[mid] = (out[mid] ?? 0) + 1;
    }
  }
  return out;
}
