import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import {
  readVisitUploadBySegments,
  uploadSegmentsLookSafe,
} from "@/lib/uploads/readVisitUploadFile";

type RouteContext = { params: Promise<{ path: string[] }> };

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

  if (!uploadSegmentsLookSafe(segments)) {
    return new Response("Bad Request", { status: 400 });
  }

  const file = await readVisitUploadBySegments(user.id, segments);
  if (file === null) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
