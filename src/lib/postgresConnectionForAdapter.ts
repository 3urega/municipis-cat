/**
 * `@prisma/adapter-pg` usa `node-postgres`, que només accepta connexió directa
 * `postgresql://` / `postgres://`. Les URLs `prisma+postgres://` (Accelerate) no valen aquí.
 *
 * Defineix **DIRECT_URL** amb la connexió directa (postgresql://…) del teu Postgres.
 * Alternativa: **DATABASE_URL_LOCAL** amb la mateixa URL si ja la tens separada del `prisma+`.
 */

function isDirectPostgresUrl(url: string): boolean {
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * URL postgres directa per a l’adapter: prioritat DIRECT_URL, després DATABASE_URL_LOCAL
 * (útil si DATABASE_URL és prisma+accelerate i la directa va en un altre nom).
 */
function resolveDirectPostgresUrl(): string | undefined {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct !== undefined && direct.length > 0) {
    return direct;
  }
  const localAlias = process.env.DATABASE_URL_LOCAL?.trim();
  if (
    localAlias !== undefined &&
    localAlias.length > 0 &&
    isDirectPostgresUrl(localAlias)
  ) {
    return localAlias;
  }
  return undefined;
}

/** Per scripts (seed): exigeix URL directa o DATABASE_URL postgresql. */
export function getPostgresConnectionStringForAdapter(): string {
  const resolved = resolveDirectPostgresUrl();
  if (resolved !== undefined) {
    return resolved;
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url === undefined || url.length === 0) {
    throw new Error("DATABASE_URL o DIRECT_URL ha d’estar definit");
  }
  if (isDirectPostgresUrl(url)) {
    return url;
  }
  throw new Error(
    "Amb Prisma Accelerate (prisma+postgres://), define DIRECT_URL o DATABASE_URL_LOCAL amb postgresql://… per a @prisma/adapter-pg.",
  );
}

const LOCAL_DEFAULT =
  "postgresql://catalunya:catalunya@127.0.0.1:15432/catalunya_map?schema=public";

/**
 * Per `next start` / API: mateixa regla que l’adapter; si no hi ha res definit, Postgres local Docker.
 * Si només hi ha prisma+ sense DIRECT_URL, falla en crear el client (no es pot amagar amb localhost).
 */
export function getPostgresConnectionStringForPrismaApp(): string {
  const resolved = resolveDirectPostgresUrl();
  if (resolved !== undefined) {
    return resolved;
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url === undefined || url.length === 0) {
    return LOCAL_DEFAULT;
  }
  if (isDirectPostgresUrl(url)) {
    return url;
  }
  if (url.startsWith("prisma+")) {
    throw new Error(
      "DIRECT_URL o DATABASE_URL_LOCAL (postgresql://…) és obligatori per a l’API amb @prisma/adapter-pg quan DATABASE_URL és prisma+postgres://",
    );
  }
  return url;
}
