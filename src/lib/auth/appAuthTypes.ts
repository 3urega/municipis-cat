export type AppAuthUser = {
  id: string;
  email: string;
  role: string;
  name: string | null;
  image: string | null;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
