import { describe, expect, it } from "vitest";

import { parseGooglePlayPurchaseJson } from "./parseGooglePlayPurchaseJson";

describe("parseGooglePlayPurchaseJson", () => {
  it("parses productIds array and purchaseToken", () => {
    const raw = JSON.stringify({
      orderId: "GPA.x",
      packageName: "com.eurega.catmap",
      productIds: ["premium_yearly"],
      purchaseTime: 1,
      purchaseState: 0,
      purchaseToken: "abc.token",
    });
    expect(parseGooglePlayPurchaseJson(raw)).toEqual({
      purchaseToken: "abc.token",
      productId: "premium_yearly",
    });
  });

  it("returns null for invalid JSON", () => {
    expect(parseGooglePlayPurchaseJson("")).toBeNull();
  });
});
