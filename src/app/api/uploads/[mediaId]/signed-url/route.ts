import { MediaType } from "@prisma/client";

import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { signMediaAccessToken } from "@/lib/uploads/mediaAccessJwt";

const prisma = getOrCreatePrismaClient();

type RouteContext = { params: Promise<{ mediaId: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await resolveAuthUser(request);
  if (user === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { mediaId } = await context.params;
  if (mediaId.length === 0) {
    return new Response("Bad Request", { status: 400 });
  }

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { visit: { select: { userId: true } } },
  });

  if (media === null) {
    return new Response("Not Found", { status: 404 });
  }

  if (media.visit.userId !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  if (media.type === MediaType.link) {
    return HttpNextResponse.json({ url: media.url });
  }

  if (media.type !== MediaType.image) {
    return new Response("Bad Request", { status: 400 });
  }

  const token = await signMediaAccessToken(mediaId, user.id);
  const url = `/api/uploads/file/${encodeURIComponent(mediaId)}?token=${encodeURIComponent(token)}`;

  return HttpNextResponse.json({ url });
}
