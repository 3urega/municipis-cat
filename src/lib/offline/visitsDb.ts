import Dexie, { type Table } from "dexie";

export type PendingVisitRow = {
  id: string;
  userId: string;
  municipalityId: string;
  visitedAt: string;
  notes: string | null;
  synced: boolean;
  pendingAction: "create";
};

class VisitsOfflineDB extends Dexie {
  pendingVisits!: Table<PendingVisitRow, string>;

  constructor() {
    super("catalunya-map-visits-offline");
    this.version(1).stores({
      pendingVisits: "id, userId, municipalityId, synced",
    });
  }
}

let dbInstance: VisitsOfflineDB | null = null;

export function getVisitsOfflineDb(): VisitsOfflineDB {
  if (dbInstance === null) {
    dbInstance = new VisitsOfflineDB();
  }
  return dbInstance;
}

/** Esborra una fila pendent només si és de l’usuari (evita id arbitrari). */
export async function deletePendingVisitIfOwned(
  userId: string,
  id: string,
): Promise<boolean> {
  const row = await getVisitsOfflineDb().pendingVisits.get(id);
  if (row === undefined || row.userId !== userId) {
    return false;
  }
  await getVisitsOfflineDb().pendingVisits.delete(id);
  return true;
}

export async function deleteAllPendingForUser(userId: string): Promise<void> {
  await getVisitsOfflineDb().pendingVisits.where("userId").equals(userId).delete();
}

export async function getPendingVisitById(
  userId: string,
  id: string,
): Promise<PendingVisitRow | undefined> {
  const row = await getVisitsOfflineDb().pendingVisits.get(id);
  if (row === undefined || row.userId !== userId || row.synced) {
    return undefined;
  }
  return row;
}

export async function updatePendingVisitIfOwned(
  userId: string,
  id: string,
  patch: Pick<PendingVisitRow, "visitedAt" | "notes">,
): Promise<boolean> {
  const row = await getVisitsOfflineDb().pendingVisits.get(id);
  if (row === undefined || row.userId !== userId || row.synced) {
    return false;
  }
  await getVisitsOfflineDb().pendingVisits.put({
    ...row,
    visitedAt: patch.visitedAt,
    notes: patch.notes,
  });
  return true;
}
