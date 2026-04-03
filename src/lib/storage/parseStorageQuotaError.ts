import { STORAGE_QUOTA_EXCEEDED_CODE } from "./storageQuotaConstants";

const DEFAULT_QUOTA_MESSAGE =
  "S’ha assolit el límit d’emmagatzematge del compte. Allibera espai o actualitza el pla.";

export function parseStorageQuotaFromErrorBody(
  status: number,
  bodyText: string,
): { quotaExceeded: boolean; message: string } {
  if (status !== 507) {
    return { quotaExceeded: false, message: bodyText };
  }
  try {
    const j = JSON.parse(bodyText) as { code?: unknown; error?: unknown };
    if (j.code === STORAGE_QUOTA_EXCEEDED_CODE) {
      const msg =
        typeof j.error === "string" && j.error.length > 0
          ? j.error
          : DEFAULT_QUOTA_MESSAGE;
      return { quotaExceeded: true, message: msg };
    }
  } catch {
    /* ignore */
  }
  return { quotaExceeded: false, message: bodyText };
}
