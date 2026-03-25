# Catalunya Map

Aplicación web con **mapa interactivo de los municipios de Cataluña** (Leaflet + GeoJSON). Permite **registrar visitas** por municipio (texto, enlaces e imágenes), con autenticación de usuario y datos persistentes en **PostgreSQL** (Prisma).

## Qué hace el proyecto

- **Mapa**: carga los polígonos municipales (`public/data/catalunya-municipis.geojson`), los normaliza a WGS84 y colorea cada municipio según cuántas visitas tenga el usuario.
- **Panel lateral**: al seleccionar un municipio se listan las visitas y se pueden crear otras nuevas.
- **Detalle por municipio**: ruta `/municipality/[municipalityId]` con muro de notas (post-its), edición y modal de detalle.
- **Backend**: rutas API en `src/app/api/`; la lógica de dominio y casos de uso sigue **arquitectura cebolla / DDD** en `src/contexts/`.
- **Autenticación**: Auth.js v5 con **OAuth de GitHub**; en desarrollo también hay **credentials** (ver `.env.example` y el seed).

## Requisitos

- Node.js y npm
- Docker (recomendado para Postgres local)

## Puesta en marcha

1. Variables de entorno:

   ```bash
   cp .env.example .env
   ```

   Ajusta `AUTH_SECRET`, `AUTH_URL` y, si aplica, `AUTH_GITHUB_*`. La base de datos por defecto apunta a Postgres en el **puerto 15432** (ver `docker compose`).

2. Base de datos:

   ```bash
   npm run docker:up
   ```

3. Migraciones y datos iniciales (municipios y usuario de desarrollo):

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Desarrollo:

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (la app no va en Docker) |
| `npm run prep` | Lint + tests + build |
| `npm run test` | Vitest |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run docker:up` | Postgres (suele mapearse a `localhost:15432`; ver `.env.example`) |
| `npm run docker:up:with-ollama` | Compose con perfil Ollama (si no usas otro en `:11434`) |
| `npm run db:migrate` | Migraciones Prisma |
| `npm run db:seed` | Municipios + superadmin de desarrollo |

## Arquitectura (resumen)

- **Frontend**: `src/app/` (App Router), componentes en `src/components/`, estado del mapa con Zustand (`src/store/`).
- **API**: `src/app/api/`.
- **Dominio y aplicación**: `src/contexts/` (patrones descritos en `docs/`).
- **Base de datos**: Prisma (`prisma/schema.prisma`); modelos principales: `User`, `Municipality`, `Visit` y medios asociados.

Para convenciones detalladas (API, inyección de dependencias con Diod, pruebas, estilo), usa el mapa de `docs/` que aparece en `AGENTS.md`; no hace falta leer toda la documentación de entrada.

## Stack principal

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Leaflet / react-leaflet, Prisma 7, PostgreSQL, Auth.js, Vitest.

## Despliegue

Cualquier plataforma compatible con Next.js (por ejemplo Vercel). En producción configura `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` y las credenciales OAuth necesarias.
