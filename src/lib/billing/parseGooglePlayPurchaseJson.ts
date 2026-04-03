export type ParsedGooglePlayPurchase = {
  purchaseToken: string;
  productId: string;
};

/**
 * JSON retornat per `Purchase.getOriginalJson()` al client Android (Play Billing).
 */
export function parseGooglePlayPurchaseJson(
  jsonStr: string,
): ParsedGooglePlayPurchase | null {
  try {
    const o = JSON.parse(jsonStr) as Record<string, unknown>;
    const token = o.purchaseToken;
    if (typeof token !== "string" || token.length === 0) {
      return null;
    }
    let productId: string | undefined;
    const productIds = o.productIds;
    if (Array.isArray(productIds) && productIds.length > 0) {
      const first = productIds[0];
      if (typeof first === "string" && first.length > 0) {
        productId = first;
      }
    }
    if (productId === undefined && typeof o.productId === "string") {
      productId = o.productId;
    }
    if (productId === undefined || productId.length === 0) {
      return null;
    }
    return { purchaseToken: token, productId };
  } catch {
    return null;
  }
}
