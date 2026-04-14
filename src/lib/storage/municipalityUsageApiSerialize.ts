import type { UserPlan } from "@prisma/client";

import {
  isStorageUnlimitedRole,
  maxDistinctMunicipalitiesForPlan,
} from "@/lib/storage/userPlanLimits";

export type UserMunicipalityUsageApiFields = {
  municipalitiesUsedCount: number;
  municipalitiesLimit: number | null;
};

export function userMunicipalityUsageApiFields(input: {
  plan: UserPlan;
  role: string;
  distinctMunicipalitiesCount: number;
}): UserMunicipalityUsageApiFields {
  if (isStorageUnlimitedRole(input.role)) {
    return {
      municipalitiesUsedCount: input.distinctMunicipalitiesCount,
      municipalitiesLimit: null,
    };
  }
  return {
    municipalitiesUsedCount: input.distinctMunicipalitiesCount,
    municipalitiesLimit: maxDistinctMunicipalitiesForPlan(input.plan),
  };
}
