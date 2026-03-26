import { parseVisitJson } from "@/lib/visitListJson";
import {
  VISITS_OFFLINE_SYNCED_EVENT,
  type VisitsOfflineSyncedDetail,
} from "@/lib/offline/offlineVisitConstants";
import { getVisitsOfflineDb } from "@/lib/offline/visitsDb";

export async function syncPendingVisits(userId: string): Promise<number> {
  const db = getVisitsOfflineDb();
  const rows = await db
    .pendingVisits.where("userId")
    .equals(userId)
    .filter((r) => !r.synced && r.pendingAction === "create")
    .toArray();

  let removed = 0;
  const replacements: VisitsOfflineSyncedDetail["replacements"] = [];

  for (const row of rows) {
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          municipalityId: row.municipalityId,
          visitedAt: row.visitedAt,
          notes:
            row.notes !== null && row.notes.trim().length > 0
              ? row.notes
              : undefined,
        }),
      });

      if (res.status === 201) {
        const json: unknown = await res.json();
        const created = parseVisitJson(json);
        if (created !== null) {
          await db.pendingVisits.delete(row.id);
          replacements.push({ localId: row.id, remoteId: created.id });
          removed += 1;
        }
      }
    } catch {
      /* mantenim la fila per al següent intent */
    }
  }

  if (removed > 0 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<VisitsOfflineSyncedDetail>(VISITS_OFFLINE_SYNCED_EVENT, {
        detail: { replacements },
      }),
    );
  }

  return removed;
}
