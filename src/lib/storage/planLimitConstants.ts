import { USER_PLAN_FREE_MAX_DISTINCT_MUNICIPALITIES } from "@/lib/storage/userPlanLimits";

export const FREE_PLAN_MUNICIPALITY_LIMIT_EXCEEDED_CODE =
  "FREE_PLAN_MUNICIPALITY_LIMIT_EXCEEDED" as const;

export const USER_IMAGE_LIMIT_EXCEEDED_CODE =
  "USER_IMAGE_LIMIT_EXCEEDED" as const;

export const USER_IMAGE_LIMIT_EXCEEDED_MESSAGE_CA =
  "Has assolit el límit de fotos al servidor pel teu pla. Esborra imatges d’altres visites o actualitza el pla.";

export const FREE_PLAN_MUNICIPALITY_LIMIT_MESSAGE_CA = `El pla gratuït permet com a màxim ${String(USER_PLAN_FREE_MAX_DISTINCT_MUNICIPALITIES)} municipis diferents amb visites. Pots afegir més visites als municipis que ja tens; per visitar més municipis nous, passa’t a Premium o allibera municipis esborrant visites.`;
