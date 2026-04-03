import { rm, stat, unlink } from "fs/promises";
import path from "node:path";

import {
  parseUploadSegmentsFromMediaUrl,
  uploadSegmentsLookSafe,
} from "./readVisitUploadFile";

function resolveUploadFilePath(
  owningUserId: string,
  segments: string[],
): string | null {
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
  return full;
}

export function isLocalVisitUploadUrl(url: string): boolean {
  return parseUploadSegmentsFromMediaUrl(url) !== null;
}

export async function statVisitUploadForUser(
  mediaUrl: string,
  owningUserId: string,
): Promise<number | null> {
  const segments = parseUploadSegmentsFromMediaUrl(mediaUrl);
  if (segments === null) {
    return null;
  }
  const full = resolveUploadFilePath(owningUserId, segments);
  if (full === null) {
    return null;
  }
  try {
    const s = await stat(full);
    return s.isFile() ? Number(s.size) : null;
  } catch {
    return null;
  }
}

export async function unlinkVisitUploadForUser(
  mediaUrl: string,
  owningUserId: string,
): Promise<boolean> {
  const segments = parseUploadSegmentsFromMediaUrl(mediaUrl);
  if (segments === null) {
    return false;
  }
  const full = resolveUploadFilePath(owningUserId, segments);
  if (full === null) {
    return false;
  }
  try {
    await unlink(full);
    return true;
  } catch {
    return false;
  }
}

export async function removeVisitUploadDirectory(
  userId: string,
  visitId: string,
): Promise<void> {
  if (
    userId.length === 0 ||
    visitId.length === 0 ||
    userId.includes("/") ||
    userId.includes("\\") ||
    visitId.includes("/") ||
    visitId.includes("\\")
  ) {
    return;
  }
  const dir = path.join(process.cwd(), "uploads", userId, visitId);
  await rm(dir, { recursive: true, force: true });
}
