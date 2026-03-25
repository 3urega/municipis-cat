# Fase 2 — Data bridge (GeoJSON → BD → API → UI)

## `DATABASE_URL`

Defineix la connexió en **quin dels fitxers següents existeixi** (es carreguen en cadena; l’últim sobreescriu):

`.env` → `.env.development` → `.env.dev` → `.env.local`

- Copia `.env.example` a `.env` si ho prefereixes.
- El seed (`npm run db:seed`) i `prisma.config.ts` criden `loadProjectEnv()` explícitament.
- En **Next** (API routes), `src/instrumentation.ts` també crida `loadProjectEnv()` en runtime Node perquè `.env.dev` no quedi fora.

## Ordre recomanat

1. `npm run docker:up` (o PostgreSQL amb `DATABASE_URL` configurada)
2. `npm run db:migrate`
3. `npm run db:seed` (o `npx prisma db seed`)
4. `npm run dev`

Sense sembra (`db:seed`), `POST /api/visits` retornarà 404 per municipi inexistent.

## GeoJSON municipal (polígons)

- Fitxer: `public/data/catalunya-municipis.geojson` (OSM).
- El mapa **només** usa features amb geometria `Polygon` / `MultiPolygon` (es ignoren punts i altres).
- **ID a BD i a la UI**: es deriva amb `ref:idescat` (5–6 dígits, preferit) o `ine:municipio` (vegeu `src/lib/municipalityIne.ts`). Ha de coincidir amb `Municipality.id` del seed.
- **Nom**: `name` o `name:ca` del feature; si falta, es fa servir el nom de la BD (`Municipi {id}` al seed).
- Coordenades ja en WGS84: `normalizeCatalunyaFeatureCollectionProjection` no altera aquestes geometries; si en el futur hi ha UTM, es reprojeciona com abans.

## Autenticació (multiusuari)

- Auth.js v5 + GitHub OAuth + usuaris a PostgreSQL (Prisma). La **sessió a la cookie és JWT** (obligatori perquè el proveïdor Credentials sigui coherent amb `auth()`; els comptes OAuth segueixen creant `User`/`Account` a la BD). Config: [`src/auth.ts`](src/auth.ts), ruta [`src/app/api/auth/[...nextauth]/route.ts`](src/app/api/auth/[...nextauth]/route.ts).
- Variables: vegeu [`.env.example`](.env.example) (`AUTH_SECRET`, `AUTH_URL`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`).
- **Dev (només `NODE_ENV=development`)**: proveïdor «Entra com a dev» amb usuari sembrat `dev-superadmin@local.dev`, rol `superadmin`, contrasenya `123qweASD` (scripts [`scripts/seed-dev-superadmin.ts`](scripts/seed-dev-superadmin.ts) dins `npm run db:seed`). A producció aquest proveïdor no es registra.
- El mapa (`/`) exigeix sessió: redirecció a `/login` des del layout [`src/app/(app)/layout.tsx`](src/app/(app)/layout.tsx). **No hi ha `middleware.ts`**: el runtime Edge de Next no és compatible amb el client Prisma + `pg`; la protecció és layout + APIs.
- Cada visita té `userId`; el `visitCount` dels municipis compta només les visites de l’usuari actual. La migració `20260325160000_auth_users_and_visit_userid` esborra `media` i `visits` anteriors (no hi havia usuari vinculat).

## API

- `GET /api/municipalities` — cal cookie de sessió; cada ítem inclou `visitCount` (de l’usuari).
- `POST /api/visits` — cos `CreateVisitBody` (`municipalityId`, `visitedAt` ISO, `notes` opcional, `media` opcional).
- `GET /api/visits?municipalityId=` — llistat de visites de l’usuari per municipi.

## Client

- **Zustand** (`useMunicipalities`): només selecció `{ id, name } | null` i `municipalitiesNonce` per forçar refetch després de registrar una visita.
- **Mapa**: capa `GeoJSON` amb hover, clic dins el polígon i colors segons `visitCount` de l’API.
- **Panell**: registra visita via API i mostra historial breu quan el GET de visites funciona.
