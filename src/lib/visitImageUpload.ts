/** Mida màxima per fitxer (5 MiB). */
export const VISIT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const allowedMimeToExt: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function visitImageMimeToExtension(mime: string): string | undefined {
  return allowedMimeToExt[mime];
}

export function isAllowedVisitImageMime(mime: string): boolean {
  return mime in allowedMimeToExt;
}
