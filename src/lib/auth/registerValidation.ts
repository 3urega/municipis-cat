const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;

export function normalizeRegisterEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateRegisterInput(
  email: string,
  password: string,
): { ok: true } | { ok: false; error: string } {
  const e = normalizeRegisterEmail(email);
  if (e.length === 0) {
    return { ok: false, error: "Cal indicar un correu." };
  }
  if (!EMAIL_RE.test(e)) {
    return { ok: false, error: "El correu no és vàlid." };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `La contrasenya ha de tenir almenys ${String(PASSWORD_MIN_LENGTH)} caràcters.`,
    };
  }
  return { ok: true };
}
