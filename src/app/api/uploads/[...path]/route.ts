import { readFile } from "fs/promises";
import path from "node:path";

import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";

const extToMime: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type RouteContext = { params: Promise<{ path: string[] }> };

function segmentsLookSafe(segments: string[]): boolean {
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

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await resolveAuthUser(request);
  if (user === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { path: segments } = await context.params;
  if (segments.length < 3) {
    return new Response("Bad Request", { status: 400 });
  }

  const userId = segments[0];
  if (userId !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!segmentsLookSafe(segments)) {
    return new Response("Bad Request", { status: 400 });
  }

  const cwd = process.cwd();
  const full = path.resolve(cwd, "uploads", ...segments);
  const allowedRoot = path.resolve(cwd, "uploads", user.id);
  if (!full.startsWith(allowedRoot + path.sep) && full !== allowedRoot) {
    return new Response("Forbidden", { status: 403 });
  }

  let data: Buffer;
  try {
    data = await readFile(full);
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const ext = path.extname(full).toLowerCase();
  const contentType = extToMime[ext] ?? "application/octet-stream";

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
