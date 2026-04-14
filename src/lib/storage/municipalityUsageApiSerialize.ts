import type { UserPlan } from "@prisma/client";

import {
  computeTotalAllowedMunicipalities,
} from "@/lib/rewards/rewardMunicipalityAds";
import { isStorageUnlimitedRole } from "@/lib/storage/userPlanLimits";

export type UserMunicipalityUsageApiFields = {
  municipalitiesUsedCount: number;
  municipalitiesLimit: number | null;
};

export function userMunicipalityUsageApiFields(input: {
  plan: UserPlan;
  role: string;
  distinctMunicipalitiesCount: number;
  rewardUnlockBlocks: number;
  municipalityCatalogCount: number;
}): UserMunicipalityUsageApiFields {
  if (isStorageUnlimitedRole(input.role)) {
    return {
      municipalitiesUsedCount: input.distinctMunicipalitiesCount,
      municipalitiesLimit: null,
    };
  }
  if (input.plan !== "FREE") {
    return {
      municipalitiesUsedCount: input.distinctMunicipalitiesCount,
      municipalitiesLimit: null,
    };
  }
  return {
    municipalitiesUsedCount: input.distinctMunicipalitiesCount,
    municipalitiesLimit: computeTotalAllowedMunicipalities(
      input.rewardUnlockBlocks,
      input.municipalityCatalogCount,
    ),
  };
}
