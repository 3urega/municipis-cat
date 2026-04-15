const DEFAULT_PRIVACY_POLICY_URL = "https://eurega.es/privacy";

/**
 * URL pública de la política de privacitat (Play Console / RGPD).
 * `NEXT_PUBLIC_*` s’incrusta en build; si falta, es fa servir el valor per defecte.
 */
export function getPrivacyPolicyUrl(): string {
  const u = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL?.trim();
  return u && u.length > 0 ? u : DEFAULT_PRIVACY_POLICY_URL;
}

/** `true` si `NEXT_PUBLIC_PRIVACY_POLICY_URL` està definit al build (no només el valor per defecte). */
export function hasConfiguredPrivacyPolicyUrl(): boolean {
  const u = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL?.trim();
  return u !== undefined && u.length > 0;
}
