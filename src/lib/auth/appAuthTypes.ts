export type UserPlanLiteral = "FREE" | "PREMIUM";

/** Només PREMIUM (o rols amb privilegis equivalents al servidor) puja imatges al núvol; FREE només emmagatzematge local. */
export function planSyncsVisitImagesToServer(plan: UserPlanLiteral): boolean {
  return plan === "PREMIUM";
}

export type AppAuthUser = {
  id: string;
  email: string;
  role: string;
  name: string | null;
  image: string | null;
  plan: UserPlanLiteral;
  storageUsed: string;
  storageLimitBytes: number;
  isStorageUnlimited: boolean;
  /** Municipis distints amb almenys una visita (servidor). */
  municipalitiesUsedCount: number;
  /** `null` = sense límit (Premium o superadmin). */
  municipalitiesLimit: number | null;
  /** Anuncis recompensats comptabilitzats (totals). Només rellevant per a FREE. */
  rewardAdsWatched: number;
  /** Anuncis fins al proper desbloqueig de +15 municipis (cicle de 3). */
  rewardNextUnlockIn: number;
  /** Anuncis recompensats avui (UTC), per al límit diari. */
  rewardAdsDailyCount: number;
  /** Imatges (`MediaType.image`) emmagatzemades al servidor (totes les visites). */
  imagesUsedCount: number;
  /** Màxim d’imatges al servidor segons pla; `null` si el rol està exempt (p. ex. superadmin). */
  imagesLimit: number | null;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
