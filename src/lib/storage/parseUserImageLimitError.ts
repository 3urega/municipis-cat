import {
  USER_IMAGE_LIMIT_EXCEEDED_CODE,
  USER_IMAGE_LIMIT_EXCEEDED_MESSAGE_CA,
} from "@/lib/storage/planLimitConstants";

export function parseUserImageLimitFromErrorBody(
  status: number,
  bodyText: string,
): { limitExceeded: boolean; message: string } {
  if (status !== 403) {
    return { limitExceeded: false, message: bodyText };
  }
  try {
    const j = JSON.parse(bodyText) as { code?: unknown; error?: unknown };
    if (j.code === USER_IMAGE_LIMIT_EXCEEDED_CODE) {
      const msg =
        typeof j.error === "string" && j.error.length > 0
          ? j.error
          : USER_IMAGE_LIMIT_EXCEEDED_MESSAGE_CA;
      return { limitExceeded: true, message: msg };
    }
  } catch {
    /* ignore */
  }
  return { limitExceeded: false, message: bodyText };
}
