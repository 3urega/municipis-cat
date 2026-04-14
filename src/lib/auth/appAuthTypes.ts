export type UserPlanLiteral = "FREE" | "PREMIUM";

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
  /** Imatges (`MediaType.image`) emmagatzemades al servidor (totes les visites). */
  imagesUsedCount: number;
  /** Màxim d’imatges al servidor segons pla; `null` si el rol està exempt (p. ex. superadmin). */
  imagesLimit: number | null;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
