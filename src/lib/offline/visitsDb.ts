import Dexie, { type Table } from "dexie";

export type PendingVisitAction = "create" | "update" | "delete";

export type PendingVisitRow = {
  id: string;
  userId: string;
  municipalityId: string;
  visitedAt: string;
  notes: string | null;
  pendingAction: PendingVisitAction;
  /** Visit id al servidor (null mentre el create encara no s’ha sincronitzat) */
  serverVisitId: string | null;
};

export type PendingImageRow = {
  autoId?: number;
  userId: string;
  /** Id de visita en UI (UUID local en creates; id servidor en visites remotes) */
  localVisitId: string;
  serverVisitId: string | null;
  blob: ArrayBuffer;
  mimeType: string;
  createdAt: string;
  synced: boolean;
};

export type MunicipalitiesSnapshotRow = {
  /** Mateix que userId per clau única */
  key: string;
  payloadJson: string;
  savedAt: string;
};

/** Imatges pla FREE: només al dispositiu (mai es pugen). `visitKey` = id servidor o id local pendent. */
export type FreeLocalImageRow = {
  localImageId: string;
  userId: string;
  visitKey: string;
  blob: ArrayBuffer;
  mimeType: string;
  sortIndex: number;
  createdAt: string;
};

class VisitsOfflineDB extends Dexie {
  pendingVisits!: Table<PendingVisitRow, string>;
  pendingImages!: Table<PendingImageRow, number>;
  municipalitiesSnapshot!: Table<MunicipalitiesSnapshotRow, string>;
  freeLocalImages!: Table<FreeLocalImageRow, string>;

  constructor() {
    super("catalunya-map-visits-offline");
    this.version(1).stores({
      pendingVisits: "id, userId, municipalityId, synced",
    });
    this.version(2)
      .stores({
        pendingVisits: "id, userId, municipalityId, pendingAction, serverVisitId",
        pendingImages: "++autoId, userId, localVisitId, serverVisitId, synced",
        municipalitiesSnapshot: "key",
      })
      .upgrade(async (tx) => {
        const t = tx.table("pendingVisits");
        await t.toCollection().modify((row: Record<string, unknown>) => {
          delete row.synced;
          if (row.serverVisitId === undefined) {
            row.serverVisitId = null;
          }
          if (row.pendingAction === undefined) {
            row.pendingAction = "create";
          }
        });
      });
    this.version(3).stores({
      pendingVisits: "id, userId, municipalityId, pendingAction, serverVisitId",
      pendingImages: "++autoId, userId, localVisitId, serverVisitId, synced",
      municipalitiesSnapshot: "key",
      freeLocalImages: "localImageId, userId, visitKey",
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

export async function deletePendingVisitIfOwned(
  userId: string,
  id: string,
): Promise<boolean> {
  const row = await getVisitsOfflineDb().pendingVisits.get(id);
  if (
    row === undefined ||
    row.userId !== userId ||
    row.pendingAction !== "create"
  ) {
    return false;
  }
  const db = getVisitsOfflineDb();
  await db.pendingVisits.delete(id);
  await db.pendingImages
    .where("userId")
    .equals(userId)
    .filter((img) => img.localVisitId === id)
    .delete();
  await deleteFreeLocalImagesForVisit(userId, id);
  return true;
}

export async function deleteAllPendingForUser(userId: string): Promise<void> {
  const db = getVisitsOfflineDb();
  await db.pendingVisits.where("userId").equals(userId).delete();
  await db.pendingImages.where("userId").equals(userId).delete();
  await db.freeLocalImages.where("userId").equals(userId).delete();
  await db.municipalitiesSnapshot.delete(userId);
}

export async function deleteFreeLocalImagesForVisit(
  userId: string,
  visitKey: string,
): Promise<void> {
  await getVisitsOfflineDb()
    .freeLocalImages.where("userId")
    .equals(userId)
    .filter((r) => r.visitKey === visitKey)
    .delete();
}

export async function replaceFreeLocalImagesForVisit(
  userId: string,
  visitKey: string,
  items: { blob: ArrayBuffer; mimeType: string }[],
): Promise<void> {
  await deleteFreeLocalImagesForVisit(userId, visitKey);
  const db = getVisitsOfflineDb();
  let sortIndex = 0;
  for (const it of items) {
    await db.freeLocalImages.add({
      localImageId: crypto.randomUUID(),
      userId,
      visitKey,
      blob: it.blob,
      mimeType: it.mimeType,
      sortIndex,
      createdAt: new Date().toISOString(),
    });
    sortIndex += 1;
  }
}

export async function listFreeLocalImagesForVisitSorted(
  userId: string,
  visitKey: string,
): Promise<FreeLocalImageRow[]> {
  const rows = await getVisitsOfflineDb()
    .freeLocalImages.where("userId")
    .equals(userId)
    .filter((r) => r.visitKey === visitKey)
    .toArray();
  rows.sort((a, b) => a.sortIndex - b.sortIndex);
  return rows;
}

export async function deleteFreeLocalImageById(
  userId: string,
  localImageId: string,
): Promise<boolean> {
  const row = await getVisitsOfflineDb().freeLocalImages.get(localImageId);
  if (row === undefined || row.userId !== userId) {
    return false;
  }
  await getVisitsOfflineDb().freeLocalImages.delete(localImageId);
  return true;
}

export async function getFreeLocalImageById(
  userId: string,
  localImageId: string,
): Promise<FreeLocalImageRow | undefined> {
  const row = await getVisitsOfflineDb().freeLocalImages.get(localImageId);
  if (row === undefined || row.userId !== userId) {
    return undefined;
  }
  return row;
}

export async function rekeyFreeLocalVisitImages(
  userId: string,
  oldKey: string,
  newKey: string,
): Promise<void> {
  const rows = await getVisitsOfflineDb()
    .freeLocalImages.where("userId")
    .equals(userId)
    .filter((r) => r.visitKey === oldKey)
    .toArray();
  const db = getVisitsOfflineDb();
  for (const r of rows) {
    await db.freeLocalImages.put({ ...r, visitKey: newKey });
  }
}

export async function getFreeLocalImageCountByVisitKey(
  userId: string,
): Promise<Map<string, number>> {
  const imgs = await getVisitsOfflineDb()
    .freeLocalImages.where("userId")
    .equals(userId)
    .toArray();
  const m = new Map<string, number>();
  for (const img of imgs) {
    m.set(img.visitKey, (m.get(img.visitKey) ?? 0) + 1);
  }
  return m;
}

export async function getPendingVisitById(
  userId: string,
  id: string,
): Promise<PendingVisitRow | undefined> {
  const row = await getVisitsOfflineDb().pendingVisits.get(id);
  if (
    row === undefined ||
    row.userId !== userId ||
    row.pendingAction === "delete"
  ) {
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
  if (
    row === undefined ||
    row.userId !== userId ||
    row.pendingAction !== "create"
  ) {
    return false;
  }
  await getVisitsOfflineDb().pendingVisits.put({
    ...row,
    visitedAt: patch.visitedAt,
    notes: patch.notes,
  });
  return true;
}

/** Cua d’actualització d’una visita ja existent al servidor. */
export async function upsertPendingUpdate(
  userId: string,
  input: {
    serverVisitId: string;
    municipalityId: string;
    visitedAt: string;
    notes: string | null;
  },
): Promise<void> {
  const db = getVisitsOfflineDb();
  const existing = await db.pendingVisits.get(input.serverVisitId);
  if (
    existing !== undefined &&
    existing.userId === userId &&
    existing.pendingAction === "create"
  ) {
    await db.pendingVisits.put({
      ...existing,
      visitedAt: input.visitedAt,
      notes: input.notes,
    });
    return;
  }
  await db.pendingVisits.put({
    id: input.serverVisitId,
    userId,
    municipalityId: input.municipalityId,
    visitedAt: input.visitedAt,
    notes: input.notes,
    pendingAction: "update",
    serverVisitId: input.serverVisitId,
  });
}

/** Cua esborrat servidor (o esborra només local si encara és create). */
export async function queuePendingDeleteOrRemoveLocal(
  userId: string,
  input: { visitId: string; municipalityId: string },
): Promise<void> {
  const db = getVisitsOfflineDb();
  const row = await db.pendingVisits.get(input.visitId);
  if (row !== undefined && row.userId === userId) {
    if (row.pendingAction === "create") {
      await db.pendingVisits.delete(input.visitId);
      await db.pendingImages
        .where("userId")
        .equals(userId)
        .filter((img) => img.localVisitId === input.visitId)
        .delete();
      await deleteFreeLocalImagesForVisit(userId, input.visitId);
      return;
    }
  }
  await db.pendingVisits.put({
    id: input.visitId,
    userId,
    municipalityId: input.municipalityId,
    visitedAt: "",
    notes: null,
    pendingAction: "delete",
    serverVisitId: input.visitId,
  });
}

export async function listAllOutboxRowsForUser(
  userId: string,
): Promise<PendingVisitRow[]> {
  return getVisitsOfflineDb().pendingVisits.where("userId").equals(userId).toArray();
}

export async function addPendingImage(
  userId: string,
  input: {
    localVisitId: string;
    serverVisitId: string | null;
    blob: ArrayBuffer;
    mimeType: string;
  },
): Promise<void> {
  await getVisitsOfflineDb().pendingImages.add({
    userId,
    localVisitId: input.localVisitId,
    serverVisitId: input.serverVisitId,
    blob: input.blob,
    mimeType: input.mimeType,
    createdAt: new Date().toISOString(),
    synced: false,
  });
}

export async function listPendingImagesForVisit(
  userId: string,
  visitId: string,
): Promise<PendingImageRow[]> {
  return getVisitsOfflineDb()
    .pendingImages.where("userId")
    .equals(userId)
    .filter(
      (img) =>
        !img.synced &&
        (img.localVisitId === visitId || img.serverVisitId === visitId),
    )
    .toArray();
}

export async function countPendingImagesForVisit(
  userId: string,
  visitId: string,
): Promise<number> {
  const list = await listPendingImagesForVisit(userId, visitId);
  return list.length;
}

/** Una sola lectura per fusionar moltes visites sense N+1. */
export async function getUnsyncedPendingImageCountByLocalVisitId(
  userId: string,
): Promise<Map<string, number>> {
  const imgs = await getVisitsOfflineDb()
    .pendingImages.where("userId")
    .equals(userId)
    .filter((i) => !i.synced)
    .toArray();
  const m = new Map<string, number>();
  for (const img of imgs) {
    m.set(img.localVisitId, (m.get(img.localVisitId) ?? 0) + 1);
  }
  return m;
}

export async function deletePendingImagesForVisit(
  userId: string,
  visitId: string,
): Promise<void> {
  await getVisitsOfflineDb()
    .pendingImages.where("userId")
    .equals(userId)
    .filter(
      (img) =>
        img.localVisitId === visitId || img.serverVisitId === visitId,
    )
    .delete();
}

export async function updateImageServerVisitIdForLocalVisit(
  userId: string,
  localVisitId: string,
  serverVisitId: string,
): Promise<void> {
  await getVisitsOfflineDb()
    .pendingImages.where("userId")
    .equals(userId)
    .filter(
      (img) => img.localVisitId === localVisitId && !img.synced,
    )
    .modify({ serverVisitId });
}

export async function deletePendingImageByAutoId(
  userId: string,
  autoId: number,
): Promise<boolean> {
  const row = await getVisitsOfflineDb().pendingImages.get(autoId);
  if (row === undefined || row.userId !== userId) {
    return false;
  }
  await getVisitsOfflineDb().pendingImages.delete(autoId);
  return true;
}

export async function saveMunicipalitiesSnapshot(
  userId: string,
  payload: unknown,
): Promise<void> {
  await getVisitsOfflineDb().municipalitiesSnapshot.put({
    key: userId,
    payloadJson: JSON.stringify(payload),
    savedAt: new Date().toISOString(),
  });
}

export async function loadMunicipalitiesSnapshot(
  userId: string,
): Promise<unknown | null> {
  const row = await getVisitsOfflineDb().municipalitiesSnapshot.get(userId);
  if (row === undefined) {
    return null;
  }
  try {
    return JSON.parse(row.payloadJson) as unknown;
  } catch {
    return null;
  }
}
