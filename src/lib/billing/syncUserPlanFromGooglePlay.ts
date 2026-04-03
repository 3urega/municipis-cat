import type { PrismaClient } from "@prisma/client";
import { UserPlan } from "@prisma/client";

import {
  getGooglePlayPackageName,
  isGooglePlayBillingConfigured,
  verifySubscriptionPurchase,
} from "@/lib/billing/googlePlayAndroidPublisher";

function shouldDowngradeAfterFailedVerify(reason: string): boolean {
  if (
    reason === "Subscription expired" ||
    reason === "Payment pending" ||
    reason === "Missing expiry from Google" ||
    reason === "Invalid product"
  ) {
    return true;
  }
  return /not found|404|invalid/i.test(reason);
}

/**
 * Revalida la subscripció des de Google i actualitza `User.plan` i la fila local.
 * Només invocar si l’usuari té registres a `GooglePlaySubscription` (upgrade via Play).
 */
export async function syncUserPlanFromGooglePlay(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  const sub = await prisma.googlePlaySubscription.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  if (sub === null) {
    return;
  }

  if (!isGooglePlayBillingConfigured()) {
    if (
      sub.expiryTime !== null &&
      sub.expiryTime.getTime() <= Date.now()
    ) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: UserPlan.FREE },
      });
    }
    return;
  }

  const pkg = getGooglePlayPackageName();
  const result = await verifySubscriptionPurchase(
    pkg,
    sub.productId,
    sub.purchaseToken,
  );

  if (result.ok) {
    const exp = Number(result.data.expiryTimeMillis!);
    await prisma.googlePlaySubscription.update({
      where: { id: sub.id },
      data: {
        expiryTime: new Date(exp),
        autoRenewing: result.data.autoRenewing ?? false,
        orderId: result.data.orderId ?? null,
        packageName: pkg,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { plan: UserPlan.PREMIUM },
    });
    return;
  }

  if (shouldDowngradeAfterFailedVerify(result.reason)) {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: UserPlan.FREE },
    });
  }
}
