import type { UserPlan } from "@prisma/client";

export const USER_PLAN_FREE_BYTES = 50 * 1024 * 1024;
export const USER_PLAN_PREMIUM_BYTES = 2 * 1024 * 1024 * 1024;

/** Municipis distints amb almenys una visita (pla FREE). */
export const USER_PLAN_FREE_MAX_DISTINCT_MUNICIPALITIES = 10;

/** Total d’imatges (`MediaType.image`) al servidor per usuari. */
export const USER_PLAN_FREE_MAX_IMAGES = 10;
export const USER_PLAN_PREMIUM_MAX_IMAGES = 20;

/** Missatge d’usuari quan es supera el límit global de fotos (403 API / domini). */
export function userImageLimitExceededUserMessage(
  plan: UserPlan,
  max: number,
): string {
  if (plan === "PREMIUM") {
    return `Has assolit el límit de ${String(max)} fotos al servidor del pla Premium. Esborra imatges d’altres visites per poder-ne afegir de noves.`;
  }
  return `Has assolit el límit de ${String(max)} fotos al servidor del pla gratuït. Esborra imatges o passa’t a Premium (fins a ${String(USER_PLAN_PREMIUM_MAX_IMAGES)} fotos).`;
}

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

/** Imatges màximes emmagatzemades al servidor segons pla (no aplica a superadmin). */
export function maxStoredImagesForPlan(plan: UserPlan): number {
  switch (plan) {
    case "PREMIUM":
      return USER_PLAN_PREMIUM_MAX_IMAGES;
    case "FREE":
    default:
      return USER_PLAN_FREE_MAX_IMAGES;
  }
}

/** `null` = sense límit d’imatges (superadmin). */
export function effectiveMaxStoredImages(
  plan: UserPlan,
  role: string,
): number | null {
  if (isStorageUnlimitedRole(role)) {
    return null;
  }
  return maxStoredImagesForPlan(plan);
}
