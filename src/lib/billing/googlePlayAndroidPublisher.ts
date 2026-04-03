import type { androidpublisher_v3 } from "googleapis";
import { google } from "googleapis";

import { GOOGLE_PLAY_PREMIUM_PRODUCT_ID } from "@/lib/billing/googlePlayConstants";

let publisherClient: androidpublisher_v3.Androidpublisher | null = null;
let publisherInitFailed = false;

export function getGooglePlayPackageName(): string {
  return (
    process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || "com.eurega.catmap"
  );
}

export function isGooglePlayBillingConfigured(): boolean {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  return typeof raw === "string" && raw.trim().length > 0;
}

export async function getAndroidPublisher(): Promise<androidpublisher_v3.Androidpublisher | null> {
  if (publisherInitFailed) {
    return null;
  }
  if (publisherClient !== null) {
    return publisherClient;
  }
  const json = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (json === undefined || json.trim().length === 0) {
    publisherInitFailed = true;
    return null;
  }
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(json) as Record<string, unknown>;
  } catch {
    publisherInitFailed = true;
    return null;
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  publisherClient = google.androidpublisher({
    version: "v3",
    auth,
  });
  return publisherClient;
}

export type VerifiedSubscription =
  | {
      ok: true;
      data: androidpublisher_v3.Schema$SubscriptionPurchase;
    }
  | { ok: false; reason: string };

export async function verifySubscriptionPurchase(
  packageName: string,
  subscriptionId: string,
  purchaseToken: string,
): Promise<VerifiedSubscription> {
  if (subscriptionId !== GOOGLE_PLAY_PREMIUM_PRODUCT_ID) {
    return { ok: false, reason: "Invalid product" };
  }
  const publisher = await getAndroidPublisher();
  if (publisher === null) {
    return { ok: false, reason: "Google Play API not configured" };
  }
  try {
    const { data } = await publisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });
    if (data.expiryTimeMillis === undefined || data.expiryTimeMillis === null) {
      return { ok: false, reason: "Missing expiry from Google" };
    }
    const exp = Number(data.expiryTimeMillis);
    if (!Number.isFinite(exp) || exp <= Date.now()) {
      return { ok: false, reason: "Subscription expired" };
    }
    if (data.paymentState === 0) {
      return { ok: false, reason: "Payment pending" };
    }
    return { ok: true, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Google API error";
    return { ok: false, reason: msg };
  }
}
