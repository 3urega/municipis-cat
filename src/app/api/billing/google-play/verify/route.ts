import { UserPlan } from "@prisma/client";

import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import {
  getGooglePlayPackageName,
  verifySubscriptionPurchase,
} from "@/lib/billing/googlePlayAndroidPublisher";
import { GOOGLE_PLAY_PREMIUM_PRODUCT_ID } from "@/lib/billing/googlePlayConstants";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";
import { userStorageApiFields } from "@/lib/storage/storageApiSerialize";

const prisma = getOrCreatePrismaClient();

function readBody(json: unknown): {
  purchaseToken: string;
  productId: string;
} | null {
  if (typeof json !== "object" || json === null) {
    return null;
  }
  const o = json as Record<string, unknown>;
  const purchaseToken =
    typeof o.purchaseToken === "string" ? o.purchaseToken.trim() : "";
  const productId =
    typeof o.productId === "string" ? o.productId.trim() : "";
  if (purchaseToken.length === 0 || productId.length === 0) {
    return null;
  }
  return { purchaseToken, productId };
}

export async function POST(request: Request): Promise<Response> {
  const authUser = await resolveAuthUser(request);
  if (authUser === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return HttpNextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = readBody(json);
  if (body === null) {
    return HttpNextResponse.json(
      { error: "Expected purchaseToken and productId (strings)" },
      { status: 400 },
    );
  }

  if (body.productId !== GOOGLE_PLAY_PREMIUM_PRODUCT_ID) {
    return HttpNextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  const packageName = getGooglePlayPackageName();
  const verified = await verifySubscriptionPurchase(
    packageName,
    body.productId,
    body.purchaseToken,
  );

  if (!verified.ok) {
    return HttpNextResponse.json(
      { error: verified.reason, code: "PLAY_VERIFY_FAILED" },
      { status: 400 },
    );
  }

  const { data } = verified;
  const exp = Number(data.expiryTimeMillis!);

  const existing = await prisma.googlePlaySubscription.findUnique({
    where: { purchaseToken: body.purchaseToken },
    select: { userId: true },
  });
  if (existing !== null && existing.userId !== authUser.id) {
    return HttpNextResponse.json(
      {
        error: "This purchase is already linked to another account",
        code: "PLAY_PURCHASE_CONFLICT",
      },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.googlePlaySubscription.upsert({
      where: { purchaseToken: body.purchaseToken },
      create: {
        userId: authUser.id,
        productId: body.productId,
        purchaseToken: body.purchaseToken,
        packageName,
        orderId: data.orderId ?? null,
        expiryTime: new Date(exp),
        autoRenewing: data.autoRenewing ?? false,
      },
      update: {
        userId: authUser.id,
        productId: body.productId,
        packageName,
        orderId: data.orderId ?? null,
        expiryTime: new Date(exp),
        autoRenewing: data.autoRenewing ?? false,
      },
    });

    await tx.user.update({
      where: { id: authUser.id },
      data: { plan: UserPlan.PREMIUM },
    });
  });

  const row = await prisma.user.findUniqueOrThrow({
    where: { id: authUser.id },
    select: {
      plan: true,
      storageUsed: true,
      role: true,
    },
  });

  return HttpNextResponse.json({
    ok: true,
    ...userStorageApiFields({
      plan: row.plan,
      storageUsed: row.storageUsed,
      role: row.role ?? "user",
    }),
  });
}
