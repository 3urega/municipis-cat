import type { Product } from "@adplorg/capacitor-in-app-purchase";
import { CapacitorInAppPurchase } from "@adplorg/capacitor-in-app-purchase";
import { Capacitor } from "@capacitor/core";

import { apiFetch } from "@/lib/apiUrl";

import { GOOGLE_PLAY_PREMIUM_PRODUCT_ID } from "@/lib/billing/googlePlayConstants";
import { parseGooglePlayPurchaseJson } from "@/lib/billing/parseGooglePlayPurchaseJson";

export type PremiumProductForUi = {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  currencyCode: string;
};

function productToUi(p: Product): PremiumProductForUi {
  return {
    id: p.id,
    displayName: p.displayName,
    description: p.description,
    displayPrice: p.displayPrice,
    currencyCode: p.currencyCode,
  };
}

/**
 * Carrega el producte Premium des de Google Play (preu visible abans de comprar).
 */
export async function fetchPremiumProductForUi(): Promise<{
  product: PremiumProductForUi | null;
  error: string | null;
}> {
  if (!isAndroidBillingAvailable()) {
    return { product: null, error: null };
  }
  try {
    const { products } = await CapacitorInAppPurchase.getProducts({
      productIds: [GOOGLE_PLAY_PREMIUM_PRODUCT_ID],
    });
    const found = products.find((p) => p.id === GOOGLE_PLAY_PREMIUM_PRODUCT_ID);
    if (found === undefined) {
      return {
        product: null,
        error:
          "No s’ha trobat el producte premium_yearly a Google Play. Comprova que estigui publicat per aquesta app.",
      };
    }
    return { product: productToUi(found), error: null };
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "No s’han pogut carregar els productes de Google Play.";
    return { product: null, error: msg };
  }
}

export function isAndroidBillingAvailable(): boolean {
  return (
    typeof window !== "undefined" && Capacitor.getPlatform() === "android"
  );
}

async function verifyPurchaseOnServer(transactionJson: string): Promise<boolean> {
  const parsed = parseGooglePlayPurchaseJson(transactionJson);
  if (
    parsed === null ||
    parsed.productId !== GOOGLE_PLAY_PREMIUM_PRODUCT_ID
  ) {
    return false;
  }
  const res = await apiFetch("/api/billing/google-play/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      purchaseToken: parsed.purchaseToken,
      productId: parsed.productId,
    }),
  });
  return res.ok;
}

/**
 * Després del login: sincronitza subscripcions actives amb el servidor.
 * @returns true si s’ha validat alguna compra i convé refrescar `/api/auth/me`.
 */
export async function restorePremiumAfterLogin(userId: string): Promise<boolean> {
  if (!isAndroidBillingAvailable() || userId.length === 0) {
    return false;
  }
  try {
    const { subscriptions } =
      await CapacitorInAppPurchase.getActiveSubscriptions();
    for (const json of subscriptions) {
      const parsed = parseGooglePlayPurchaseJson(json);
      if (parsed?.productId !== GOOGLE_PLAY_PREMIUM_PRODUCT_ID) {
        continue;
      }
      if (await verifyPurchaseOnServer(json)) {
        return true;
      }
    }
  } catch {
    /* sense Play o sense compres */
  }
  return false;
}

export async function purchasePremiumYearly(userId: string): Promise<void> {
  if (!isAndroidBillingAvailable()) {
    throw new Error("Només disponible a l’app Android.");
  }
  if (userId.length === 0) {
    throw new Error("Cal iniciar sessió.");
  }

  const { products } = await CapacitorInAppPurchase.getProducts({
    productIds: [GOOGLE_PLAY_PREMIUM_PRODUCT_ID],
  });
  const product = products.find((p) => p.id === GOOGLE_PLAY_PREMIUM_PRODUCT_ID);
  if (product === undefined) {
    throw new Error(
      "No s’ha trobat el producte a Google Play. Comprova que estigui publicat i que l’app sigui la mateixa.",
    );
  }
  const offerToken = product.basePlans?.[0]?.offerToken;
  const { transaction } = await CapacitorInAppPurchase.purchaseSubscription({
    productId: GOOGLE_PLAY_PREMIUM_PRODUCT_ID,
    referenceUUID: userId,
    offerToken,
  });
  const ok = await verifyPurchaseOnServer(transaction);
  if (!ok) {
    throw new Error(
      "Validació del servidor fallida. Comprova la connexió o torna-ho a provar.",
    );
  }
}

export async function restorePremiumManual(): Promise<boolean> {
  if (!isAndroidBillingAvailable()) {
    return false;
  }
  try {
    const { subscriptions } =
      await CapacitorInAppPurchase.getActiveSubscriptions();
    for (const json of subscriptions) {
      if (await verifyPurchaseOnServer(json)) {
        return true;
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function openPlaySubscriptionSettings(): Promise<void> {
  if (!isAndroidBillingAvailable()) {
    return;
  }
  await CapacitorInAppPurchase.manageSubscriptions({});
}
