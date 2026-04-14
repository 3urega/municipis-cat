import "reflect-metadata";

import { MediaType } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { VisitFinder } from "@/contexts/geo-journal/visits/application/find/VisitFinder";
import { VisitNotFoundError } from "@/contexts/geo-journal/visits/domain/VisitNotFoundError";
import { UserStorageQuotaService } from "@/contexts/shared/application/UserStorageQuotaService";
import { StorageQuotaExceededError } from "@/contexts/shared/domain/StorageQuotaExceededError";
import { container } from "@/contexts/shared/infrastructure/dependency-injection/diod.config";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";
import { USER_IMAGE_LIMIT_EXCEEDED_CODE } from "@/lib/storage/planLimitConstants";
import { STORAGE_QUOTA_EXCEEDED_CODE } from "@/lib/storage/storageQuotaConstants";
import {
  effectiveMaxStoredImages,
  isStorageUnlimitedRole,
  userImageLimitExceededUserMessage,
} from "@/lib/storage/userPlanLimits";
import {
  isAllowedVisitImageMime,
  visitImageMimeToExtension,
  VISIT_IMAGE_MAX_BYTES,
} from "@/lib/visitImageUpload";

type RouteContext = { params: Promise<{ visitId: string }> };

const prisma = getOrCreatePrismaClient();

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await resolveAuthUser(request);
  if (user === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { visitId } = await context.params;
  if (visitId.length === 0) {
    return HttpNextResponse.json({ error: "Invalid visit id" }, { status: 400 });
  }

  try {
    await container.get(VisitFinder).find(visitId, user.id);
  } catch (error) {
    if (error instanceof VisitNotFoundError) {
      return HttpNextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    throw error;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return HttpNextResponse.json(
      { error: "Invalid multipart body" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return HttpNextResponse.json(
      { error: 'Expected multipart field "file"' },
      { status: 400 },
    );
  }

  if (!isAllowedVisitImageMime(file.type)) {
    return HttpNextResponse.json(
      { error: "Only JPEG, PNG or WebP images are allowed" },
      { status: 400 },
    );
  }

  if (file.size > VISIT_IMAGE_MAX_BYTES) {
    return HttpNextResponse.json(
      { error: "File too large (max 5 MiB)" },
      { status: 413 },
    );
  }

  const ext = visitImageMimeToExtension(file.type);
  if (ext === undefined) {
    return HttpNextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "uploads", user.id, visitId);
  const fullPath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  const quota = container.get(UserStorageQuotaService);

  const uRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, role: true },
  });
  if (uRow === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    uRow.plan === "FREE" &&
    !isStorageUnlimitedRole(uRow.role ?? "user")
  ) {
    return HttpNextResponse.json(
      {
        error:
          "El pla gratuït desa les fotos només en aquest dispositiu. Passa’t a Premium per la còpia al núvol.",
      },
      { status: 403 },
    );
  }
  const maxImages = effectiveMaxStoredImages(uRow.plan, uRow.role ?? "user");
  if (maxImages !== null) {
    const imageCount = await prisma.media.count({
      where: {
        type: MediaType.image,
        visit: { userId: user.id },
      },
    });
    if (imageCount >= maxImages) {
      return HttpNextResponse.json(
        {
          error: userImageLimitExceededUserMessage(uRow.plan, maxImages),
          code: USER_IMAGE_LIMIT_EXCEEDED_CODE,
        },
        { status: 403 },
      );
    }
  }

  try {
    await quota.reserveBytes(user.id, file.size, async () => {
      await mkdir(dir, { recursive: true });
      await writeFile(fullPath, buffer);
    });
  } catch (e) {
    if (e instanceof StorageQuotaExceededError) {
      return HttpNextResponse.json(
        {
          error: "Storage quota exceeded",
          code: STORAGE_QUOTA_EXCEEDED_CODE,
        },
        { status: 507 },
      );
    }
    throw e;
  }

  const url = `/api/uploads/${user.id}/${visitId}/${filename}`;

  return HttpNextResponse.json(
    { url, type: MediaType.image, sizeBytes: file.size },
    { status: 201 },
  );
}
