/**
 * Login per credencials («dev-superadmin» + seed): desenvolupament o producció
 * explícita amb AUTH_ALLOW_CREDENTIALS=true (només entorns privats).
 * Només s’usa al servidor (Auth); sense això, `signIn("dev-credentials")` no existe.
 */
export function isCredentialsLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.AUTH_ALLOW_CREDENTIALS === "true"
  );
}

/**
 * Si es mostra el formulari mail/contrasenya (export estàtic / Capacitor).
 * Cal definir al build si `AUTH_*` no arriba al HTML generat:
 * `NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS=true` (el servidor ha d’estar igual amb `AUTH_ALLOW_CREDENTIALS=true`).
 */
export function isCredentialsLoginUiShown(): boolean {
  return (
    isCredentialsLoginEnabled() ||
    process.env.NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS === "true"
  );
}
