/**
 * `@prisma/adapter-pg` usa `node-postgres`, que només accepta connexió directa
 * `postgresql://` / `postgres://`. Les URLs `prisma+postgres://` (Accelerate) no valen aquí.
 *
 * Al panell de Prisma Postgres: copia la connexió **directa** (postgresql://…) com a DIRECT_URL.
 * Pots mantenir DATABASE_URL amb prisma+ per al CLI si cal, però l’app i els seeds usen DIRECT_URL.
 */

function isDirectPostgresUrl(url: string): boolean {
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/** Per scripts (seed): exigeix URL directa o DATABASE_URL postgresql. */
export function getPostgresConnectionStringForAdapter(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct !== undefined && direct.length > 0) {
    return direct;
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url === undefined || url.length === 0) {
    throw new Error("DATABASE_URL o DIRECT_URL ha d’estar definit");
  }
  if (isDirectPostgresUrl(url)) {
    return url;
  }
  throw new Error(
    "Amb Prisma Accelerate (prisma+postgres://), define DIRECT_URL amb postgresql://… per a @prisma/adapter-pg.",
  );
}

const LOCAL_DEFAULT =
  "postgresql://catalunya:catalunya@127.0.0.1:15432/catalunya_map?schema=public";

/**
 * Per `next start` / API: mateixa regla que l’adapter; si no hi ha res definit, Postgres local Docker.
 * Si només hi ha prisma+ sense DIRECT_URL, falla en crear el client (no es pot amagar amb localhost).
 */
export function getPostgresConnectionStringForPrismaApp(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct !== undefined && direct.length > 0) {
    return direct;
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
      "DIRECT_URL (postgresql://…) és obligatori per a l’API amb @prisma/adapter-pg quan DATABASE_URL és prisma+postgres://",
    );
  }
  return url;
}
