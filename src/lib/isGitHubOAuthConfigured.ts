/**
 * Auth.js falla amb «server configuration» si el proveïdor GitHub s’instal·la
 * sense `clientId` / `clientSecret` vàlids.
 */
export function isGitHubOAuthConfigured(): boolean {
  const id = process.env.AUTH_GITHUB_ID?.trim() ?? "";
  const secretTrim = process.env.AUTH_GITHUB_SECRET?.trim() ?? "";
  return id.length > 0 && secretTrim.length > 0;
}
