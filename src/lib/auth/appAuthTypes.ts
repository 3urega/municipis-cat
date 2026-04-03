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
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
