const PLACEHOLDER_PRIVACY_URL =
  "https://example.com/replace-with-your-privacy-policy";

/**
 * URL pública de la política de privadesa (Play Console + enllaç a l’app).
 * Defineix `NEXT_PUBLIC_PRIVACY_POLICY_URL` al build de Capacitor / Next.
 */
export function getPrivacyPolicyUrl(): string {
  const raw = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL?.trim();
  if (raw !== undefined && raw.length > 0) {
    return raw;
  }
  return PLACEHOLDER_PRIVACY_URL;
}

export function hasConfiguredPrivacyPolicyUrl(): boolean {
  const raw = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL?.trim();
  return raw !== undefined && raw.length > 0;
}
