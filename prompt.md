# Brief: starter Next.js + Capacitor + backend (patrón monorepo)

## Personalización (rellena antes de pasar el prompt al agente)

- **Proyecto base Next.js**: _ruta o nombre del repo donde implementará el agente_
- **Alcance v1**: _incluir billing Google Play: sí / no · incluir AdMob + rewarded: sí / no_
- **Auth existente**: _ninguna / JWT propio / otro — notas para enganchar refresh tras verify de Play_

---

## Rol

Eres un agente de implementación. Tu trabajo es **integrar en el proyecto Next.js base** (el que abra el usuario) el **andamiaje reutilizable** descrito abajo, adaptando rutas, nombres de app y convenciones del repo existente. No construyas el producto de negocio completo: construye el **shell** (build híbrido, env, API, DB, billing opcional, ads opcional).

## Referencia conceptual (no dependas de tener el repo)

Los patrones provienen de un proyecto de referencia **municipis-cat** con:

- Next con **export estático** cuando `CAPACITOR_STATIC=1` en build de producción, para generar `out/` consumido por Capacitor.
- Durante ese build, **mover temporalmente** `src/app/api` para que el bundle móvil no embeba API; el cliente usa **`NEXT_PUBLIC_API_URL`** contra un backend desplegado.
- **Middleware CORS** solo para `/api/*`, incluyendo orígenes `capacitor://localhost` e `ionic://localhost`.
- **Prisma + `@prisma/adapter-pg`** con URL directa (`DIRECT_URL` / `DATABASE_URL_LOCAL`) documentada para entornos con `prisma+`.
- **Monetización**: suscripción Google Play verificada en servidor con **Google Play Developer API** (service account JSON en env); cliente con **Capacitor In-App Purchase**; tabla de suscripciones enlazada al usuario; función de **re-sync** que puede bajar el plan a FREE si Google dice que expiró.
- **Ads opcional**: AdMob rewarded + UMP/consent via plugin nativo Android + endpoint que registra recompensa (la regla de negocio del “qué desbloquea” es sustituible).

## Mapa de extracción (repo de referencia)

Usa estos archivos solo como **inspiración** al portar; adapta al árbol del proyecto base:

| Área | Archivos / rutas típicas en municipis-cat |
|------|---------------------------------------------|
| Capacitor | `capacitor.config.ts` |
| Next export + PWA | `next.config.ts` |
| Build móvil | `scripts/build-capacitor.ps1`, `scripts/build-capacitor.sh` |
| CORS | `src/middleware.ts` |
| Env / boot | `src/lib/loadProjectEnv.ts`, `src/instrumentation.ts` |
| Postgres / Prisma adapter | `src/lib/postgresConnectionForAdapter.ts`, `src/contexts/shared/infrastructure/prisma/` |
| DI (patrón) | `src/contexts/shared/infrastructure/dependency-injection/diod.config.ts` |
| HTTP helpers | `src/contexts/shared/infrastructure/http/HttpNextResponse.ts` |
| Docker | `docker-compose.yml` |
| Billing cliente | `src/lib/billing/googlePlayPremium.ts`, `parseGooglePlayPurchaseJson.ts`, `googlePlayConstants.ts` |
| Billing servidor | `src/lib/billing/googlePlayAndroidPublisher.ts`, `syncUserPlanFromGooglePlay.ts`, `src/app/api/billing/google-play/verify/route.ts` |
| Límites por plan (patrón) | `src/lib/storage/userPlanLimits.ts` |
| Ads | `src/lib/ads/consentPlugin.ts`, `src/lib/rewards/admobRewardVideo.ts`, `src/app/api/rewards/admob/route.ts` |
| Esquema | `prisma/schema.prisma` (`UserPlan`, `GooglePlaySubscription`, campos reward si aplica) |

**No portar como bloque**: dominio `geo-journal`, mapas Leaflet, datos territoriales, offline Dexie de visitas, scripts `data:*` de producto.

## Objetivos (must)

1. **Capacitor**: `capacitor.config.ts` con `webDir: "out"` (o el que fije Next export), `appId` y `appName` configurables.
2. **Next**: En producción, si `CAPACITOR_STATIC=1`, `output: "export"` e imágenes compatibles con export; PWA opcional pero recomendado; `serverExternalPackages` incluir `pg`, `@prisma/client`, `@prisma/adapter-pg` si aplica.
3. **Scripts**: Equivalentes a `build:capacitor` (PowerShell + bash) que hagan stash/restauración de la carpeta de API routes durante el build estático, exporten `CAPACITOR_STATIC=1`, y ejecuten `cap sync`.
4. **CORS**: Middleware (o equivalente) para preflight y headers en rutas `/api/*`.
5. **Env**: Función tipo `loadProjectEnv` que cargue `.env`, `.env.development`, `.env.dev`, `.env.local` en orden de override; `instrumentation.ts` que en Node avise si faltan secretos críticos en producción.
6. **Postgres**: `docker-compose` mínimo para desarrollo; Prisma con migraciones; conexión adapter documentada.
7. **Billing (Google Play)** — si la sección “Personalización” indica incluirlo en v1:
   - Modelo `User` con `plan` (enum FREE/PREMIUM o el que definas) y modelo `GooglePlaySubscription` (purchaseToken único, userId, productId, fechas, etc.).
   - Cliente: módulo que use `@adplorg/capacitor-in-app-purchase` para listar producto, comprar, restaurar suscripciones activas; parseo JSON de compra; POST a `POST /api/billing/google-play/verify` con `purchaseToken` y `productId`.
   - Servidor: verificación con `googleapis` androidpublisher `purchases.subscriptions.get`; actualizar usuario y upsert de suscripción; manejar conflicto si el token ya está ligado a otro usuario.
   - Job o hook post-login: función tipo `syncUserPlanFromGooglePlay` para revalidar y degradar si aplica.
8. **Variables**: Documentar en `.env.example`: `NEXT_PUBLIC_API_URL`, `CAPACITOR_STATIC` (solo build), `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, IDs de producto, `AUTH_SECRET`, URLs de DB, AdMob si aplica.

## No objetivos (must not)

- No portar dominio específico (mapas, GeoJSON territorial, visitas offline, etc.) salvo un **ejemplo mínimo** si hace falta para probar API.
- No hardcodear textos de producto de la app de referencia; usar placeholders.
- No eliminar convenciones del proyecto base sin justificar (por ejemplo estructura `src/contexts` si ya existe).

## Orden de implementación sugerido

1. Variables y Docker + Prisma schema mínimo + `loadProjectEnv` + `instrumentation`.
2. Middleware CORS para `/api/*`.
3. Ajustes `next.config` + scripts `build:capacitor` + probar `npm run build` con export y `cap sync`.
4. Si billing en v1: módulo billing (schema + rutas + cliente + sync).
5. Si ads en v1: AdMob + consent + ruta reward con lógica genérica o stub documentado; si no, omitir o dejar TODO comentado.

## Criterios de aceptación

- `npm run dev` funciona con API en el mismo proyecto (sin export).
- Con `CAPACITOR_STATIC=1` y `NEXT_PUBLIC_API_URL` apuntando al backend, el build produce `out/` y el proyecto Android sincroniza sin errores.
- Las llamadas desde el WebView Android al backend remoto no fallan por CORS en los orígenes documentados.
- (Si billing en v1) Flujo: usuario autenticado → compra/restore → verify 200 → `plan` actualizado en DB y reflejado en sesión/API `me`.

## Entregables

- Código integrado y `.env.example` actualizado.
- Lista breve de comandos para el usuario humano: desarrollo web, build móvil, variables obligatorias en Railway/hosting.

## Preguntas al usuario humano solo si bloquean

- URL base del API en staging/producción para `NEXT_PUBLIC_API_URL`.
- Si el proyecto base ya tiene auth propia: en qué campo/token conviene enganchar el refresh de sesión tras verify de Play.

## Dependencias npm de referencia

`@adplorg/capacitor-in-app-purchase`, `@capacitor-community/admob`, `googleapis`, `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, `@prisma/client`, `@prisma/adapter-pg`, `pg` — versiones alineadas con el `package.json` del proyecto base o LTS recientes compatibles con Next.
