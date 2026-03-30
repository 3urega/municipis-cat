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

/** Registre: servidor (AUTH_ALLOW_REGISTRATION o mateix criteri que credencials). */
export function isRegistrationAllowed(): boolean {
  return (
    process.env.AUTH_ALLOW_REGISTRATION === "true" ||
    isCredentialsLoginAllowed()
  );
}

/**
 * Mostrar enllaç / pàgina de registre.
 * Igual que el login: en desenvolupament es mostra sense `NEXT_PUBLIC_*`; a l’export estàtic calen flags públics al build.
 */
export function isRegistrationUiShown(): boolean {
  return (
    isRegistrationAllowed() ||
    process.env.NEXT_PUBLIC_AUTH_ALLOW_REGISTRATION === "true" ||
    process.env.NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS === "true"
  );
}
