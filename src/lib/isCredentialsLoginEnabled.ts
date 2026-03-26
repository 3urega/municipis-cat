/**
 * Login per credencials («dev-superadmin» + seed): desenvolupament o producció
 * explícita amb AUTH_ALLOW_CREDENTIALS=true (només entorns privats).
 */
export function isCredentialsLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.AUTH_ALLOW_CREDENTIALS === "true"
  );
}
