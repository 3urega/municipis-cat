/**
 * Login per contrasenya només en desenvolupament o ambAUTH_ALLOW_CREDENTIALS=true (servidors privats).
 */
export function isCredentialsLoginAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.AUTH_ALLOW_CREDENTIALS === "true"
  );
}

/**
 * Per export estàtic / Capacitor: mostrar formulari si el build inclou el flag públic.
 */
export function isCredentialsLoginUiShown(): boolean {
  return (
    isCredentialsLoginAllowed() ||
    process.env.NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS === "true"
  );
}
