import { MediaType } from "@prisma/client";

import { apiFetch } from "@/lib/apiUrl";
import {
  VISITS_OFFLINE_SYNCED_EVENT,
  type VisitsOfflineSyncedDetail,
} from "@/lib/offline/offlineVisitConstants";
import { parseVisitJson } from "@/lib/visitListJson";
import type { CreateVisitMediaBody } from "@/types/api";
import {
  getVisitsOfflineDb,
  type PendingImageRow,
} from "@/lib/offline/visitsDb";
import { parseStorageQuotaFromErrorBody } from "@/lib/storage/parseStorageQuotaError";

function isLikelyNetworkError(e: unknown): boolean {
  return (
    e instanceof TypeError ||
    (e instanceof Error && e.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      e instanceof DOMException &&
      (e.name === "NetworkError" || e.name === "AbortError"))
  );
}

async function fetchVisit(serverVisitId: string): Promise<
  ReturnType<typeof parseVisitJson>
> {
  const res = await apiFetch(`/api/visits/${encodeURIComponent(serverVisitId)}`);
  if (!res.ok) {
    return null;
  }
  const json: unknown = await res.json();
  return parseVisitJson(json);
}

export type SyncOfflineQueueResult = {
  applied: number;
  storageQuotaExceeded: boolean;
};

async function syncImagesForVisitId(
  userId: string,
  serverVisitId: string,
  images: PendingImageRow[],
): Promise<{ ok: boolean; storageQuotaExceeded: boolean }> {
  if (images.length === 0) {
    return { ok: true, storageQuotaExceeded: false };
  }
  const visit = await fetchVisit(serverVisitId);
  if (visit === null) {
    return { ok: false, storageQuotaExceeded: false };
  }
  const newMedia: CreateVisitMediaBody[] = [];
  for (const img of images) {
    try {
      const blob = new Blob([img.blob], { type: img.mimeType });
      const fd = new FormData();
      fd.append("file", blob, "upload");
      const res = await apiFetch(
        `/api/visits/${encodeURIComponent(serverVisitId)}/images`,
        { method: "POST", body: fd },
      );
      if (!res.ok) {
        const text = await res.text();
        const { quotaExceeded } = parseStorageQuotaFromErrorBody(
          res.status,
          text,
        );
        return { ok: false, storageQuotaExceeded: quotaExceeded };
      }
      const j: unknown = await res.json();
      if (
        typeof j !== "object" ||
        j === null ||
        typeof (j as { url?: unknown }).url !== "string" ||
        !(
          (j as { type?: unknown }).type === MediaType.image ||
          (j as { type?: unknown }).type === MediaType.link
        )
      ) {
        return { ok: false, storageQuotaExceeded: false };
      }
      const o = j as { url: string; type: MediaType };
      newMedia.push({ url: o.url, type: o.type });
    } catch (e) {
      if (isLikelyNetworkError(e)) {
        return { ok: false, storageQuotaExceeded: false };
      }
      throw e;
    }
  }
  const patchRes = await apiFetch(`/api/visits/${encodeURIComponent(serverVisitId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media: [...visit.media, ...newMedia] }),
    });
  if (!patchRes.ok) {
    return { ok: false, storageQuotaExceeded: false };
  }
  for (const img of images) {
    if (img.autoId !== undefined) {
      await getVisitsOfflineDb().pendingImages.delete(img.autoId);
    }
  }
  return { ok: true, storageQuotaExceeded: false };
}

/**
 * Sincronitza la cua offline: creates → imatges → updates → deletes.
 */
export async function syncOfflineQueue(
  userId: string,
): Promise<SyncOfflineQueueResult> {
  const db = getVisitsOfflineDb();
  let applied = 0;
  let storageQuotaExceeded = false;
  const replacements: VisitsOfflineSyncedDetail["replacements"] = [];

  const bump = (n: number): void => {
    applied += n;
  };

  try {
    const creates = await db.pendingVisits
      .where("userId")
      .equals(userId)
      .filter((r) => r.pendingAction === "create")
      .toArray();

    for (const row of creates) {
      try {
        const res = await apiFetch("/api/visits", {
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
        if (res.status !== 201) {
          continue;
        }
        const json: unknown = await res.json();
        const created = parseVisitJson(json);
        if (created === null) {
          continue;
        }
        const localId = row.id;
        await db.pendingVisits.delete(localId);
        replacements.push({ localId, remoteId: created.id });
        bump(1);
        await db
          .pendingImages.where("userId")
          .equals(userId)
          .filter((img) => img.localVisitId === localId && !img.synced)
          .modify({ serverVisitId: created.id, localVisitId: created.id });

        const imgs = await db
          .pendingImages.where("userId")
          .equals(userId)
          .filter(
            (img) =>
              !img.synced &&
              img.serverVisitId === created.id,
          )
          .toArray();
        if (imgs.length > 0) {
          const imgRes = await syncImagesForVisitId(
            userId,
            created.id,
            imgs,
          );
          if (imgRes.storageQuotaExceeded) {
            storageQuotaExceeded = true;
          } else if (imgRes.ok) {
            bump(imgs.length);
          }
        }
      } catch (e) {
        if (!isLikelyNetworkError(e)) {
          throw e;
        }
      }
    }

    const pendingWithServer = await db
      .pendingImages.where("userId")
      .equals(userId)
      .filter((i) => !i.synced && i.serverVisitId !== null)
      .toArray();
    const byServer = new Map<string, PendingImageRow[]>();
    for (const img of pendingWithServer) {
      const sid = img.serverVisitId;
      if (sid === null) {
        continue;
      }
      const arr = byServer.get(sid) ?? [];
      arr.push(img);
      byServer.set(sid, arr);
    }
    for (const [sid, imgs] of byServer) {
      if (imgs.length === 0 || storageQuotaExceeded) {
        continue;
      }
      const imgRes = await syncImagesForVisitId(userId, sid, imgs);
      if (imgRes.storageQuotaExceeded) {
        storageQuotaExceeded = true;
      } else if (imgRes.ok) {
        bump(imgs.length);
      }
    }

    const updates = await db.pendingVisits
      .where("userId")
      .equals(userId)
      .filter((r) => r.pendingAction === "update")
      .toArray();

    for (const row of updates) {
      const sid = row.serverVisitId ?? row.id;
      const pendingImgs = await db
        .pendingImages.where("userId")
        .equals(userId)
        .filter(
          (i) =>
            !i.synced &&
            (i.serverVisitId === sid || i.localVisitId === sid),
        )
        .toArray();
      if (pendingImgs.length > 0) {
        if (storageQuotaExceeded) {
          continue;
        }
        const imgRes = await syncImagesForVisitId(userId, sid, pendingImgs);
        if (imgRes.storageQuotaExceeded) {
          storageQuotaExceeded = true;
          continue;
        }
        if (!imgRes.ok) {
          continue;
        }
      }
      try {
        const visit = await fetchVisit(sid);
        if (visit === null) {
          continue;
        }
        const res = await apiFetch(`/api/visits/${encodeURIComponent(sid)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitedAt: row.visitedAt,
            notes: row.notes,
            media: visit.media,
          }),
        });
        if (res.ok) {
          await db.pendingVisits.delete(row.id);
          bump(1);
        }
      } catch (e) {
        if (!isLikelyNetworkError(e)) {
          throw e;
        }
      }
    }

    const deletes = await db.pendingVisits
      .where("userId")
      .equals(userId)
      .filter((r) => r.pendingAction === "delete")
      .toArray();

    for (const row of deletes) {
      const sid = row.serverVisitId ?? row.id;
      try {
        const res = await apiFetch(`/api/visits/${encodeURIComponent(sid)}`, {
          method: "DELETE",
        });
        if (res.ok || res.status === 204 || res.status === 404) {
          await db.pendingVisits.delete(row.id);
          await db
            .pendingImages.where("userId")
            .equals(userId)
            .filter(
              (img) =>
                img.localVisitId === sid || img.serverVisitId === sid,
            )
            .delete();
          bump(1);
        }
      } catch (e) {
        if (!isLikelyNetworkError(e)) {
          throw e;
        }
      }
    }
  } catch (e) {
    if (!isLikelyNetworkError(e)) {
      throw e;
    }
  }

  if (applied > 0 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<VisitsOfflineSyncedDetail>(VISITS_OFFLINE_SYNCED_EVENT, {
        detail: { replacements },
      }),
    );
  }

  return { applied, storageQuotaExceeded };
}
