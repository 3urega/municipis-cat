"use client";

import { MediaType } from "@prisma/client";
import {
  Camera,
  CameraResultType,
  CameraSource,
  type Photo,
} from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { VisitWithMediaPrimitives } from "@/contexts/geo-journal/visits/domain/VisitWithMediaPrimitives";
import { AuthenticatedImg } from "@/components/AuthenticatedImg";
import { PermissionExplanationModal } from "@/components/PermissionExplanationModal";
import { apiFetch } from "@/lib/apiUrl";
import { createVisitOfflineFirst } from "@/lib/offline/createVisitOfflineFirst";
import {
  VISITS_OFFLINE_SYNCED_EVENT,
  type VisitsOfflineSyncedDetail,
} from "@/lib/offline/offlineVisitConstants";
import type { VisitWithOfflineMeta } from "@/lib/offline/mergePendingVisits";
import { isLikelyNetworkError } from "@/lib/offline/networkErrors";
import { parseVisitJson } from "@/lib/visitListJson";
import {
  addPendingImage,
  deletePendingImageByAutoId,
  deletePendingImagesForVisit,
  deletePendingVisitIfOwned,
  getPendingVisitById,
  listPendingImagesForVisit,
  queuePendingDeleteOrRemoveLocal,
  updatePendingVisitIfOwned,
  upsertPendingUpdate,
} from "@/lib/offline/visitsDb";
import { parseStorageQuotaFromErrorBody } from "@/lib/storage/parseStorageQuotaError";
import { parseUserImageLimitFromErrorBody } from "@/lib/storage/parseUserImageLimitError";
import { StorageQuotaExceededClientError } from "@/lib/storage/StorageQuotaExceededClientError";
import { UserImageLimitExceededClientError } from "@/lib/storage/UserImageLimitExceededClientError";
import { PremiumUpsellLink } from "@/components/PremiumUpsellLink";
import {
  formatBytesAsMiB,
  pickPrimaryUsageAxis,
  storageBytesRemaining,
  storageUsagePercentFromFields,
  thresholdLevelFromPercent,
} from "@/lib/usage/usageThresholds";
import type { CreateVisitMediaBody } from "@/types/api";

/** Estat local del formulari: inclou `id` de Media quan ve del servidor (URLs signades). */
type VisitEditorMediaRow = CreateVisitMediaBody & { id?: string };
import {
  VISIT_IMAGE_MAX_BYTES,
  isAllowedVisitImageMime,
  visitImageMimeToExtension,
} from "@/lib/visitImageUpload";

const VISIT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp" as const;

function toDatetimeLocalValue(d: Date): string {
  const p = (n: number): string => {
    return String(n).padStart(2, "0");
  };
  return `${String(d.getFullYear())}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

type PendingUpload = {
  file: File;
  previewUrl: string;
  dexieAutoId?: number;
};

async function persistPendingImagesToDexie(
  userId: string,
  visitId: string,
  serverVisitId: string | null,
  uploads: PendingUpload[],
): Promise<void> {
  await deletePendingImagesForVisit(userId, visitId);
  for (const p of uploads) {
    const blob = await p.file.arrayBuffer();
    await addPendingImage(userId, {
      localVisitId: visitId,
      serverVisitId,
      blob,
      mimeType: p.file.type,
    });
  }
}

type VisitEditorFormProps = {
  municipalityId: string;
  editingVisitId: string | null;
  visits: VisitWithOfflineMeta[];
  onSetEditingVisitId: (id: string | null) => void;
  reloadVisits: () => Promise<void>;
  requestMunicipalitiesRefresh: () => void;
};

async function uploadVisitImage(
  visitId: string,
  file: File,
): Promise<CreateVisitMediaBody> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch(`/api/visits/${encodeURIComponent(visitId)}/images`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    const { quotaExceeded, message } = parseStorageQuotaFromErrorBody(
      res.status,
      text,
    );
    if (quotaExceeded) {
      throw new StorageQuotaExceededClientError(
        message.length > 0
          ? message
          : "S’ha assolit el límit d’emmagatzematge del compte.",
      );
    }
    const { limitExceeded, message: imageLimitMsg } =
      parseUserImageLimitFromErrorBody(res.status, text);
    if (limitExceeded) {
      throw new UserImageLimitExceededClientError(imageLimitMsg);
    }
    throw new Error(text.length > 0 ? text : `HTTP ${String(res.status)}`);
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
    throw new Error("Resposta de pujada invàlida");
  }
  const o = j as { url: string; type: MediaType };
  return { url: o.url, type: o.type };
}

function capacitorFormatToMime(format: string): string | null {
  const f = format.toLowerCase();
  if (f === "jpeg" || f === "jpg") {
    return "image/jpeg";
  }
  if (f === "png") {
    return "image/png";
  }
  if (f === "webp") {
    return "image/webp";
  }
  return null;
}

function isUserCancelledCameraError(e: unknown): boolean {
  if (e === null || e === undefined) {
    return false;
  }
  const msg =
    typeof e === "object" && "message" in e
      ? String((e as { message: unknown }).message)
      : String(e);
  return /cancel|dismiss|User cancelled|closed|abort/i.test(msg);
}

function isLikelyPermissionDenied(e: unknown): boolean {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null && "message" in e
        ? String((e as { message: unknown }).message)
        : String(e);
  return /permission|denied|not authorized|NotAllowed|settings|SETTINGS/i.test(
    msg,
  );
}

async function capturePhotoFileWithCapacitor(): Promise<File | null> {
  const photo: Photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
  });
  const fmt = photo.format ?? "jpeg";
  const mime = capacitorFormatToMime(fmt);
  if (mime === null || !isAllowedVisitImageMime(mime)) {
    return null;
  }
  const b64 = photo.base64String;
  if (b64 === undefined || b64.length === 0) {
    return null;
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mime });
  const ext = visitImageMimeToExtension(mime) ?? ".jpg";
  const file = new File([blob], `foto-${String(Date.now())}${ext}`, {
    type: mime,
  });
  if (file.size > VISIT_IMAGE_MAX_BYTES) {
    return null;
  }
  return file;
}

export function VisitEditorForm({
  municipalityId,
  editingVisitId,
  visits,
  onSetEditingVisitId,
  reloadVisits,
  requestMunicipalitiesRefresh,
}: VisitEditorFormProps): React.ReactElement {
  const { data: session, refresh: refreshAuth } = useAuth();
  const userId = session?.user?.id;
  const authUser = session?.user;
  const [visitedAtLocal, setVisitedAtLocal] = useState("");
  const [notes, setNotes] = useState("");
  const [media, setMedia] = useState<VisitEditorMediaRow[]>([]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imagePickError, setImagePickError] = useState<string | null>(null);
  const [permissionModal, setPermissionModal] = useState<
    "camera" | "gallery" | null
  >(null);
  const [showPremiumUpsell, setShowPremiumUpsell] = useState(false);

  const nearMunicipalityLimit = useMemo(() => {
    if (
      authUser === undefined ||
      authUser.plan !== "FREE" ||
      authUser.municipalitiesLimit === null
    ) {
      return false;
    }
    if (editingVisitId !== null) {
      return false;
    }
    if (visits.length > 0) {
      return false;
    }
    return authUser.municipalitiesUsedCount >= authUser.municipalitiesLimit;
  }, [authUser, editingVisitId, visits.length]);

  const storageUsageInfo = useMemo(() => {
    if (authUser === undefined || authUser.isStorageUnlimited) {
      return null;
    }
    const pct = storageUsagePercentFromFields(
      authUser.storageUsed,
      authUser.storageLimitBytes,
      authUser.isStorageUnlimited,
    );
    const remaining = storageBytesRemaining(authUser);
    const level = thresholdLevelFromPercent(pct);
    const axisMsg = pickPrimaryUsageAxis(authUser);
    return { pct, remaining, level, axisMsg };
  }, [authUser]);

  const syncedForIdRef = useRef<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const enqueueImageFiles = useCallback((files: readonly File[]): void => {
    if (files.length === 0) {
      return;
    }
    const added: PendingUpload[] = [];
    let hadOversize = false;
    for (const file of files) {
      if (!isAllowedVisitImageMime(file.type)) {
        continue;
      }
      if (file.size > VISIT_IMAGE_MAX_BYTES) {
        hadOversize = true;
        continue;
      }
      added.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (added.length > 0) {
      setPending((p) => [...p, ...added]);
    }
    if (hadOversize) {
      setImagePickError("Alguna imatge supera el límit de 5 MiB.");
    } else if (added.length === 0) {
      setImagePickError("Només es permeten JPEG, PNG o WebP (fins a 5 MiB).");
    } else {
      setImagePickError(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (editingVisitId === null) {
      syncedForIdRef.current = null;
      setOfflineNotice(null);
      setPending((prev) => {
        for (const p of prev) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return [];
      });
      setVisitedAtLocal(toDatetimeLocalValue(new Date()));
      setNotes("");
      setMedia([]);
      setSubmitError(null);
      return;
    }

    if (syncedForIdRef.current === editingVisitId) {
      return;
    }

    const fromList = visits.find((v) => v.id === editingVisitId);
    if (fromList !== undefined) {
      syncedForIdRef.current = editingVisitId;
      setPending((prev) => {
        for (const p of prev) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return [];
      });
      setVisitedAtLocal(toDatetimeLocalValue(new Date(fromList.visitedAt)));
      setNotes(fromList.notes ?? "");
      setMedia(
        fromList.media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
        })),
      );
      setSubmitError(null);
      setOfflineNotice(
        fromList.offlinePending === true
          ? "Aquesta visita és pendent de sincronitzar."
          : null,
      );
      if (typeof userId === "string") {
        void (async (): Promise<void> => {
          const imgs = await listPendingImagesForVisit(
            userId,
            editingVisitId,
          );
          if (imgs.length === 0 || cancelled) {
            return;
          }
          const next: PendingUpload[] = imgs.map((img) => {
            const blob = new Blob([img.blob], { type: img.mimeType });
            const file = new File([blob], "offline", { type: img.mimeType });
            return {
              file,
              previewUrl: URL.createObjectURL(blob),
              dexieAutoId: img.autoId,
            };
          });
          setPending(next);
        })();
      }
      return;
    }

    void (async (): Promise<void> => {
      const res = await apiFetch(`/api/visits/${encodeURIComponent(editingVisitId)}`);
      if (res.ok && !cancelled) {
        const json: unknown = await res.json();
        const v = parseVisitJson(json);
        if (v === null || cancelled) {
          return;
        }
        syncedForIdRef.current = editingVisitId;
        setPending((prev) => {
          for (const p of prev) {
            URL.revokeObjectURL(p.previewUrl);
          }
          return [];
        });
        setVisitedAtLocal(toDatetimeLocalValue(new Date(v.visitedAt)));
        setNotes(v.notes ?? "");
        setMedia(
          v.media.map((m) => ({
            id: m.id,
            type: m.type,
            url: m.url,
          })),
        );
        setSubmitError(null);
        setOfflineNotice(null);
        if (typeof userId === "string" && !cancelled) {
          const imgs = await listPendingImagesForVisit(
            userId,
            editingVisitId,
          );
          if (imgs.length > 0 && !cancelled) {
            setPending(
              imgs.map((img) => {
                const blob = new Blob([img.blob], { type: img.mimeType });
                const file = new File([blob], "offline", {
                  type: img.mimeType,
                });
                return {
                  file,
                  previewUrl: URL.createObjectURL(blob),
                  dexieAutoId: img.autoId,
                };
              }),
            );
          }
        }
        return;
      }

      if (
        cancelled ||
        typeof userId !== "string" ||
        editingVisitId === null
      ) {
        return;
      }
      const row = await getPendingVisitById(userId, editingVisitId);
      if (row === undefined || cancelled) {
        return;
      }
      syncedForIdRef.current = editingVisitId;
      setPending((prev) => {
        for (const p of prev) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return [];
      });
      setVisitedAtLocal(toDatetimeLocalValue(new Date(row.visitedAt)));
      setNotes(row.notes ?? "");
      setMedia([]);
      setSubmitError(null);
      setOfflineNotice("Aquesta visita és pendent de sincronitzar.");
    })();

    return () => {
      cancelled = true;
    };
  }, [editingVisitId, visits, userId]);

  useEffect(() => {
    const onSynced = (ev: Event): void => {
      const detail = (ev as CustomEvent<VisitsOfflineSyncedDetail>).detail;
      if (
        detail === undefined ||
        editingVisitId === null ||
        !Array.isArray(detail.replacements)
      ) {
        return;
      }
      const hit = detail.replacements.find((r) => r.localId === editingVisitId);
      if (hit === undefined) {
        return;
      }
      syncedForIdRef.current = null;
      setOfflineNotice(null);
      onSetEditingVisitId(hit.remoteId);
      void reloadVisits();
    };
    window.addEventListener(VISITS_OFFLINE_SYNCED_EVENT, onSynced);
    return () => {
      window.removeEventListener(VISITS_OFFLINE_SYNCED_EVENT, onSynced);
    };
  }, [editingVisitId, onSetEditingVisitId, reloadVisits]);

  const handlePickFromInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const list = e.target.files;
    if (list === null) {
      return;
    }
    enqueueImageFiles(Array.from(list));
    e.target.value = "";
  };

  const runCameraAfterConsent = useCallback((): void => {
    setImagePickError(null);
    if (Capacitor.isNativePlatform()) {
      void (async (): Promise<void> => {
        try {
          const file = await capturePhotoFileWithCapacitor();
          if (file === null) {
            setImagePickError(
              "No s’ha pogut usar la foto (format no admès o massa gran).",
            );
            return;
          }
          enqueueImageFiles([file]);
        } catch (e) {
          if (isUserCancelledCameraError(e)) {
            return;
          }
          if (isLikelyPermissionDenied(e)) {
            setImagePickError(
              "Cal permís de càmera per fer fotos dels teus visites. Activa’l als ajustos del sistema per a aquesta app.",
            );
            return;
          }
          setImagePickError("No s’ha pogut obrir la càmera.");
        }
      })();
      return;
    }
    cameraInputRef.current?.click();
  }, [enqueueImageFiles]);

  const runGalleryAfterConsent = useCallback((): void => {
    setImagePickError(null);
    galleryInputRef.current?.click();
  }, []);

  const removePendingAt = (index: number): void => {
    setPending((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed !== undefined) {
        URL.revokeObjectURL(removed.previewUrl);
        if (
          typeof userId === "string" &&
          removed.dexieAutoId !== undefined
        ) {
          void deletePendingImageByAutoId(userId, removed.dexieAutoId);
        }
      }
      return copy;
    });
  };

  const removeMediaAt = (index: number): void => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (): Promise<void> => {
    setSubmitError(null);
    setShowPremiumUpsell(false);
    const visitedAt = new Date(visitedAtLocal);
    if (Number.isNaN(visitedAt.getTime())) {
      setSubmitError("Data o hora invàlides.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingVisitId === null) {
        if (typeof userId !== "string") {
          setSubmitError("Cal iniciar sessió.");
          return;
        }

        setOfflineNotice(null);
        const result = await createVisitOfflineFirst(userId, {
          municipalityId,
          visitedAt: visitedAt.toISOString(),
          notes: notes.trim().length > 0 ? notes.trim() : undefined,
        });

        if (!result.ok) {
          if (result.error === "auth") {
            setSubmitError("Cal iniciar sessió.");
          } else if (result.error === "parse") {
            setSubmitError("Resposta invàlida del servidor.");
          } else if (result.error === "storage") {
            setSubmitError(
              `No s’ha pogut desar la visita localment: ${result.message}`,
            );
          } else if (result.error === "municipality_limit") {
            setSubmitError(result.message);
            setShowPremiumUpsell(true);
          } else {
            setSubmitError(
              result.error === "http" && result.status === 404
                ? "Municipi no trobat a la base de dades."
                : result.message,
            );
          }
          return;
        }

        if (result.kind === "queued") {
          await persistPendingImagesToDexie(
            userId,
            result.visit.id,
            null,
            pending,
          );
          setPending((prev) => {
            for (const p of prev) {
              URL.revokeObjectURL(p.previewUrl);
            }
            return [];
          });
          setOfflineNotice(
            "Visita desada en aquest dispositiu; es sincronitzarà automàticament amb connexió.",
          );
          await reloadVisits();
          await refreshAuth("silent");
          onSetEditingVisitId(result.visit.id);
          syncedForIdRef.current = result.visit.id;
          return;
        }

        const created: VisitWithMediaPrimitives = result.visit;

        const combined: VisitEditorMediaRow[] = [...media];
        try {
          for (const p of pending) {
            combined.push(await uploadVisitImage(created.id, p.file));
          }
        } catch (e) {
          if (e instanceof StorageQuotaExceededClientError) {
            setSubmitError(e.message);
            setShowPremiumUpsell(true);
            requestMunicipalitiesRefresh();
            await reloadVisits();
            onSetEditingVisitId(null);
            return;
          }
          if (e instanceof UserImageLimitExceededClientError) {
            setSubmitError(e.message);
            setShowPremiumUpsell(true);
            requestMunicipalitiesRefresh();
            await reloadVisits();
            onSetEditingVisitId(null);
            await refreshAuth("silent");
            return;
          }
          throw e;
        }

        if (pending.length > 0 || combined.length > 0) {
          const patchRes = await apiFetch(`/api/visits/${encodeURIComponent(created.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media: combined.map(({ type, url }) => ({ type, url })),
            }),
          });
          if (!patchRes.ok) {
            const patchText = await patchRes.text();
            const { limitExceeded, message: imgMsg } =
              parseUserImageLimitFromErrorBody(patchRes.status, patchText);
            if (limitExceeded) {
              setSubmitError(imgMsg);
              setShowPremiumUpsell(true);
            } else {
              let display =
                "Visita creada però no s’han pogut guardar les imatges.";
              try {
                const errJson = JSON.parse(patchText) as { error?: unknown };
                if (
                  typeof errJson.error === "string" &&
                  errJson.error.length > 0
                ) {
                  display = errJson.error;
                }
              } catch {
                if (patchText.length > 0) {
                  display = patchText;
                }
              }
              setSubmitError(display);
            }
            requestMunicipalitiesRefresh();
            await reloadVisits();
            onSetEditingVisitId(null);
            await refreshAuth("silent");
            return;
          }
        }

        setPending((prev) => {
          for (const p of prev) {
            URL.revokeObjectURL(p.previewUrl);
          }
          return [];
        });
        requestMunicipalitiesRefresh();
        await reloadVisits();
        await refreshAuth("silent");
        onSetEditingVisitId(null);
        syncedForIdRef.current = null;
        return;
      }

      const notesVal =
        notes.trim().length > 0 ? notes.trim() : null;

      if (typeof userId === "string") {
        const localRow = await getPendingVisitById(userId, editingVisitId);
        if (localRow !== undefined) {
          if (localRow.pendingAction === "create") {
            const ok = await updatePendingVisitIfOwned(userId, editingVisitId, {
              visitedAt: visitedAt.toISOString(),
              notes: notesVal,
            });
            if (!ok) {
              setSubmitError("No s’ha pogut actualitzar la visita local.");
              return;
            }
          } else if (localRow.pendingAction === "update") {
            await upsertPendingUpdate(userId, {
              serverVisitId: editingVisitId,
              municipalityId,
              visitedAt: visitedAt.toISOString(),
              notes: notesVal,
            });
          }
          await persistPendingImagesToDexie(
            userId,
            editingVisitId,
            localRow.pendingAction === "create" ? null : editingVisitId,
            pending,
          );
          setPending((prev) => {
            for (const p of prev) {
              URL.revokeObjectURL(p.previewUrl);
            }
            return [];
          });
          setOfflineNotice(
            "Canvis desats en aquest dispositiu; es sincronitzaran automàticament amb connexió.",
          );
          requestMunicipalitiesRefresh();
          await reloadVisits();
          return;
        }
      }

      const offlineNoNetwork =
        typeof navigator !== "undefined" &&
        !navigator.onLine &&
        typeof userId === "string";

      if (offlineNoNetwork) {
        await upsertPendingUpdate(userId, {
          serverVisitId: editingVisitId,
          municipalityId,
          visitedAt: visitedAt.toISOString(),
          notes: notesVal,
        });
        await persistPendingImagesToDexie(
          userId,
          editingVisitId,
          editingVisitId,
          pending,
        );
        setPending((prev) => {
          for (const p of prev) {
            URL.revokeObjectURL(p.previewUrl);
          }
          return [];
        });
        setOfflineNotice(
          "Canvis desats en aquest dispositiu; es sincronitzaran automàticament amb connexió.",
        );
        requestMunicipalitiesRefresh();
        await reloadVisits();
        return;
      }

      try {
        const combined: VisitEditorMediaRow[] = [...media];
        for (const p of pending) {
          combined.push(await uploadVisitImage(editingVisitId, p.file));
        }

        const patchRes = await apiFetch(`/api/visits/${encodeURIComponent(editingVisitId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitedAt: visitedAt.toISOString(),
            notes: notesVal,
            media: combined.map(({ type, url }) => ({ type, url })),
          }),
        });

        if (patchRes.status === 404) {
          setSubmitError("Visita no trobada.");
          return;
        }

        if (!patchRes.ok) {
          const patchText = await patchRes.text();
          const { limitExceeded, message: imgMsg } =
            parseUserImageLimitFromErrorBody(patchRes.status, patchText);
          if (limitExceeded) {
            setSubmitError(imgMsg);
            setShowPremiumUpsell(true);
            await refreshAuth("silent");
            return;
          }
          let msg = `Error ${String(patchRes.status)}`;
          try {
            const errJson = JSON.parse(patchText) as { error?: unknown };
            if (typeof errJson.error === "string" && errJson.error.length > 0) {
              msg = errJson.error;
            } else if (patchText.length > 0) {
              msg = patchText;
            }
          } catch {
            if (patchText.length > 0) {
              msg = patchText;
            }
          }
          setSubmitError(msg);
          return;
        }

        setPending((prev) => {
          for (const p of prev) {
            URL.revokeObjectURL(p.previewUrl);
          }
          return [];
        });
        requestMunicipalitiesRefresh();
        await reloadVisits();
        await refreshAuth("silent");
        onSetEditingVisitId(null);
        syncedForIdRef.current = null;
      } catch (e) {
        if (e instanceof StorageQuotaExceededClientError) {
          setSubmitError(e.message);
          setShowPremiumUpsell(true);
          return;
        }
        if (e instanceof UserImageLimitExceededClientError) {
          setSubmitError(e.message);
          setShowPremiumUpsell(true);
          await refreshAuth("silent");
          return;
        }
        if (typeof userId === "string" && isLikelyNetworkError(e)) {
          await upsertPendingUpdate(userId, {
            serverVisitId: editingVisitId,
            municipalityId,
            visitedAt: visitedAt.toISOString(),
            notes: notesVal,
          });
          await persistPendingImagesToDexie(
            userId,
            editingVisitId,
            editingVisitId,
            pending,
          );
          setPending((prev) => {
            for (const p of prev) {
              URL.revokeObjectURL(p.previewUrl);
            }
            return [];
          });
          setOfflineNotice(
            "Canvis desats en aquest dispositiu; es sincronitzaran automàticament amb connexió.",
          );
          requestMunicipalitiesRefresh();
          await reloadVisits();
          return;
        }
        setSubmitError("Error de xarxa o de pujada.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVisit = async (): Promise<void> => {
    if (editingVisitId === null) {
      return;
    }
    if (
      !window.confirm("Vols esborrar aquesta visita, les notes i les imatges?")
    ) {
      return;
    }
    setDeleting(true);
    setSubmitError(null);
    try {
      if (typeof userId === "string") {
        const deletedLocal = await deletePendingVisitIfOwned(
          userId,
          editingVisitId,
        );
        if (deletedLocal) {
          setOfflineNotice(null);
          setPending((prev) => {
            for (const p of prev) {
              URL.revokeObjectURL(p.previewUrl);
            }
            return [];
          });
          requestMunicipalitiesRefresh();
          await reloadVisits();
          onSetEditingVisitId(null);
          syncedForIdRef.current = null;
          return;
        }
      }

      try {
        const res = await apiFetch(`/api/visits/${encodeURIComponent(editingVisitId)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          setSubmitError("No s’ha pogut esborrar la visita.");
          return;
        }
      } catch (e) {
        if (
          typeof userId === "string" &&
          isLikelyNetworkError(e)
        ) {
          await queuePendingDeleteOrRemoveLocal(userId, {
            visitId: editingVisitId,
            municipalityId,
          });
          setOfflineNotice(
            "Esborrat programat; es sincronitzarà quan hi hagi connexió.",
          );
          setPending((prev) => {
            for (const p of prev) {
              URL.revokeObjectURL(p.previewUrl);
            }
            return [];
          });
          requestMunicipalitiesRefresh();
          await reloadVisits();
          onSetEditingVisitId(null);
          syncedForIdRef.current = null;
          return;
        }
        setSubmitError("Error esborrant la visita.");
        return;
      }
      setPending((prev) => {
        for (const p of prev) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return [];
      });
      requestMunicipalitiesRefresh();
      await reloadVisits();
      await refreshAuth("silent");
      onSetEditingVisitId(null);
      syncedForIdRef.current = null;
    } catch {
      setSubmitError("Error esborrant la visita.");
    } finally {
      setDeleting(false);
    }
  };

  const isNew = editingVisitId === null;
  const title = isNew ? "Nova visita" : "Editar visita";

  return (
    <section
      id="visit-editor"
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        {!isNew ? (
          <button
            type="button"
            className="text-sm font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
            onClick={() => {
              syncedForIdRef.current = null;
              onSetEditingVisitId(null);
            }}
          >
            + Nova visita
          </button>
        ) : null}
      </div>

      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Cada visita té les seves notes i imatges. Desa per enregistrar-ho al
        servidor.
      </p>

      <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Data i hora de la visita
        <input
          type="datetime-local"
          className="mt-1 w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          value={visitedAtLocal}
          disabled={submitting}
          onChange={(e) => {
            setVisitedAtLocal(e.target.value);
          }}
        />
      </label>

      <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Notes
        <textarea
          className="mt-1 min-h-[120px] w-full rounded-md border border-zinc-300 bg-white p-3 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="Apunts d’aquest dia…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
          }}
        />
      </label>

      <div className="mb-4">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Imatges
        </p>
        {storageUsageInfo !== null && authUser !== undefined ? (
          <div
            className={`mt-2 rounded-md border px-3 py-2 text-xs ${
              storageUsageInfo.level === "critical"
                ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100"
                : storageUsageInfo.level === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100"
                  : storageUsageInfo.level === "info"
                    ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300"
            }`}
          >
            <p>
              Emmagatzematge:{" "}
              {formatBytesAsMiB(BigInt(authUser.storageUsed))} /{" "}
              {formatBytesAsMiB(authUser.storageLimitBytes)} MiB · restant{" "}
              {formatBytesAsMiB(storageUsageInfo.remaining ?? 0n)} MiB
              {storageUsageInfo.pct !== null
                ? ` (${storageUsageInfo.pct.toFixed(0)} % ple)`
                : ""}
            </p>
            {storageUsageInfo.axisMsg !== null &&
            storageUsageInfo.axisMsg.primary.kind === "storage" ? (
              <p className="mt-1 font-medium">
                {storageUsageInfo.axisMsg.message}
              </p>
            ) : null}
          </div>
        ) : null}
        {authUser !== undefined && authUser.imagesLimit !== null ? (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Fotos al servidor (totes les visites):{" "}
            {String(authUser.imagesUsedCount)} /{" "}
            {String(authUser.imagesLimit)}
          </p>
        ) : null}
        {authUser !== undefined &&
        authUser.municipalitiesLimit !== null &&
        authUser.plan === "FREE" ? (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Municipis distints amb visites:{" "}
            {String(authUser.municipalitiesUsedCount)} /{" "}
            {String(authUser.municipalitiesLimit)}
          </p>
        ) : null}
        {nearMunicipalityLimit ? (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
            <p>
              Aquest municipi encara no té cap visita desada i has assolit el
              límit de municipis distints del pla gratuït.
            </p>
            <PremiumUpsellLink
              className="mt-1 inline-block text-xs font-medium text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
              label="Veure opcions Premium"
            />
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              setImagePickError(null);
              setPermissionModal("gallery");
            }}
          >
            Galeria
          </button>
          <button
            type="button"
            disabled={submitting}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              setImagePickError(null);
              setPermissionModal("camera");
            }}
          >
            Fer foto
          </button>
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept={VISIT_IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={handlePickFromInput}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept={VISIT_IMAGE_ACCEPT}
          capture="environment"
          className="hidden"
          onChange={handlePickFromInput}
        />
        {imagePickError !== null ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {imagePickError}
          </p>
        ) : null}
        <ul className="mt-3 flex flex-wrap gap-3">
          {media.map((m, i) => (
            <li
              key={`${m.url}-${String(i)}`}
              className="relative h-24 w-24 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700"
            >
              {m.type === MediaType.image ? (
                <AuthenticatedImg
                  src={m.url}
                  mediaId={m.id}
                  mediaType={MediaType.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="block p-1 text-[10px] break-all">{m.url}</span>
              )}
              <button
                type="button"
                className="absolute right-0 top-0 rounded-bl bg-red-600 px-1.5 text-xs text-white"
                onClick={() => {
                  removeMediaAt(i);
                }}
              >
                ×
              </button>
            </li>
          ))}
          {pending.map((p, i) => (
            <li
              key={p.previewUrl}
              className="relative h-24 w-24 overflow-hidden rounded-md border border-dashed border-amber-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt=""
                className="h-full w-full object-cover opacity-90"
              />
              <button
                type="button"
                className="absolute right-0 top-0 rounded-bl bg-red-600 px-1.5 text-xs text-white"
                onClick={() => {
                  removePendingAt(i);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      {submitError !== null ? (
        <div className="mb-3">
          <p className="text-sm text-red-600 dark:text-red-400">
            {submitError}
          </p>
          {showPremiumUpsell ? <PremiumUpsellLink /> : null}
        </div>
      ) : null}

      {offlineNotice !== null ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
          {offlineNotice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={submitting}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          onClick={() => {
            void handleSave();
          }}
        >
          {submitting ? "Guardant…" : "Desar"}
        </button>
        {!isNew ? (
          <button
            type="button"
            disabled={deleting || submitting}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={() => {
              void handleDeleteVisit();
            }}
          >
            {deleting ? "Esborrant…" : "Esborrar visita"}
          </button>
        ) : null}
      </div>

      <PermissionExplanationModal
        open={permissionModal === "gallery"}
        title="Accés a la galeria"
        body="Per adjuntar imatges existents a la teva visita, l’app obrirà el selector de fotos del sistema. Només s’envien les imatges que triïs."
        confirmLabel="Continuar"
        onCancel={() => {
          setPermissionModal(null);
        }}
        onConfirm={() => {
          setPermissionModal(null);
          runGalleryAfterConsent();
        }}
      />
      <PermissionExplanationModal
        open={permissionModal === "camera"}
        title="Càmera"
        body="Per fer una foto nova des de la visita, l’app pot demanar permís per usar la càmera. Les fotos s’afegeixen només a aquesta visita."
        confirmLabel="Continuar"
        onCancel={() => {
          setPermissionModal(null);
        }}
        onConfirm={() => {
          setPermissionModal(null);
          runCameraAfterConsent();
        }}
      />
    </section>
  );
}
