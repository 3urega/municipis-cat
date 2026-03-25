import { describe, expect, it } from "vitest";

import { HttpNextResponse } from "./HttpNextResponse";

describe("HttpNextResponse", () => {
  it("returns JSON response", async (): Promise<void> => {
    const res = HttpNextResponse.json({ ok: true });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
