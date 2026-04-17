import { MediaType } from "@prisma/client";

import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";
import { verifyMediaAccessToken } from "@/lib/uploads/mediaAccessJwt";
import { readVisitUploadFileForUser } from "@/lib/uploads/readVisitUploadFile";

const prisma = getOrCreatePrismaClient();

type RouteContext = { params: Promise<{ mediaId: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { mediaId } = await context.params;
  if (mediaId.length === 0) {
    return new Response("Bad Request", { status: 400 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (token === null || token.length === 0) {
    return new Response("Unauthorized", { status: 401 });
  }

  const claims = await verifyMediaAccessToken(token);
  if (claims === null || claims.mediaId !== mediaId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { visit: { select: { userId: true } } },
  });

  if (media === null) {
    return new Response("Not Found", { status: 404 });
  }

  if (media.visit.userId !== claims.userId) {
    return new Response("Forbidden", { status: 403 });
  }

  if (media.type !== MediaType.image) {
    return new Response("Not Found", { status: 404 });
  }

  const file = await readVisitUploadFileForUser(media.url, claims.userId);
  if (file === null) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
