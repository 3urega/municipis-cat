import type { UserPlan } from "@prisma/client";

export const USER_PLAN_FREE_BYTES = 50 * 1024 * 1024;
export const USER_PLAN_PREMIUM_BYTES = 2 * 1024 * 1024 * 1024;

/** Municipis distints amb almenys una visita (pla FREE). */
export const USER_PLAN_FREE_MAX_DISTINCT_MUNICIPALITIES = 10;

export function limitBytesForPlan(plan: UserPlan): number {
  switch (plan) {
    case "PREMIUM":
      return USER_PLAN_PREMIUM_BYTES;
    case "FREE":
    default:
      return USER_PLAN_FREE_BYTES;
  }
}

/** `null` = sense límit (Premium). */
export function maxDistinctMunicipalitiesForPlan(plan: UserPlan): number | null {
  switch (plan) {
    case "PREMIUM":
      return null;
    case "FREE":
    default:
      return USER_PLAN_FREE_MAX_DISTINCT_MUNICIPALITIES;
  }
}

export function isStorageUnlimitedRole(role: string): boolean {
  return role === "superadmin";
}
