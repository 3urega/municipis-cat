import type { UserPlan } from "@prisma/client";

import { isStorageUnlimitedRole, limitBytesForPlan } from "./userPlanLimits";

export type UserStorageApiFields = {
  plan: UserPlan;
  storageUsed: string;
  storageLimitBytes: number;
  isStorageUnlimited: boolean;
};

export function userStorageApiFields(row: {
  plan: UserPlan;
  storageUsed: bigint;
  role: string;
}): UserStorageApiFields {
  return {
    plan: row.plan,
    storageUsed: row.storageUsed.toString(),
    storageLimitBytes: limitBytesForPlan(row.plan),
    isStorageUnlimited: isStorageUnlimitedRole(row.role),
  };
}
