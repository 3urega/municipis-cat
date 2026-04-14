import { describe, expect, it } from "vitest";

import {
  ADS_PER_UNLOCK_BLOCK,
  computeNextUnlockIn,
  computeTotalAllowedMunicipalities,
  REWARD_MUNICIPALITY_BASE,
  REWARD_MUNICIPALITY_EXTRA_PER_BLOCK,
} from "./rewardMunicipalityAds";

describe("rewardMunicipalityAds", () => {
  it("computeTotalAllowedMunicipalities caps at catalog", () => {
    expect(
      computeTotalAllowedMunicipalities(0, 100),
    ).toBe(REWARD_MUNICIPALITY_BASE);
    expect(
      computeTotalAllowedMunicipalities(1, 100),
    ).toBe(REWARD_MUNICIPALITY_BASE + REWARD_MUNICIPALITY_EXTRA_PER_BLOCK);
    expect(computeTotalAllowedMunicipalities(0, 3)).toBe(3);
  });

  it("computeNextUnlockIn cycles every ADS_PER_UNLOCK_BLOCK", () => {
    expect(computeNextUnlockIn(0)).toBe(ADS_PER_UNLOCK_BLOCK);
    expect(computeNextUnlockIn(1)).toBe(ADS_PER_UNLOCK_BLOCK - 1);
    expect(computeNextUnlockIn(2)).toBe(ADS_PER_UNLOCK_BLOCK - 2);
    expect(computeNextUnlockIn(3)).toBe(ADS_PER_UNLOCK_BLOCK);
  });
});
