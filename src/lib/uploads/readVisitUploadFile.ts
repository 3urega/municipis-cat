import { readFile } from "fs/promises";
import path from "node:path";

const UPLOAD_API_PREFIX = "/api/uploads/";

export const visitUploadExtToMime: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export function uploadSegmentsLookSafe(segments: string[]): boolean {
  for (const s of segments) {
    if (
      s.length === 0 ||
      s === "." ||
      s === ".." ||
      s.includes("/") ||
      s.includes("\\")
    ) {
      return false;
    }
  }
  return true;
}

export function parseUploadSegmentsFromMediaUrl(
  mediaUrl: string,
): string[] | null {
  let pathname = mediaUrl.trim();
  if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }
  if (!pathname.startsWith(UPLOAD_API_PREFIX)) {
    return null;
  }
  const rest = pathname.slice(UPLOAD_API_PREFIX.length);
  if (rest.length === 0) {
    return null;
  }
  const segments = rest.split("/").filter(Boolean);
  return segments.length > 0 ? segments : null;
}

export async function readVisitUploadBySegments(
  owningUserId: string,
  segments: string[],
): Promise<{ data: Buffer; contentType: string } | null> {
  if (segments.length < 3) {
    return null;
  }
  if (segments[0] !== owningUserId) {
    return null;
  }
  if (!uploadSegmentsLookSafe(segments)) {
    return null;
  }

  const cwd = process.cwd();
  const full = path.resolve(cwd, "uploads", ...segments);
  const allowedRoot = path.resolve(cwd, "uploads", owningUserId);
  if (!full.startsWith(allowedRoot + path.sep) && full !== allowedRoot) {
    return null;
  }

  let data: Buffer;
  try {
    data = await readFile(full);
  } catch {
    return null;
  }

  const ext = path.extname(full).toLowerCase();
  const contentType = visitUploadExtToMime[ext] ?? "application/octet-stream";
  return { data, contentType };
}

export async function readVisitUploadFileForUser(
  mediaUrl: string,
  owningUserId: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const segments = parseUploadSegmentsFromMediaUrl(mediaUrl);
  if (segments === null) {
    return null;
  }
  return readVisitUploadBySegments(owningUserId, segments);
}
