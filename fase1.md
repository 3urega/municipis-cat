# Fase 1 — Catalunya Map: estado del proyecto

Este documento describe **lo que está implementado hoy** en el repositorio: stack, estructura, backend (API + base de datos), mapa y limitaciones conocidas. Sirve como referencia para Fase 2 (persistencia desde el cliente, seed de municipios, etc.).

---

## 1. Objetivo del producto

Aplicación web **diario geográfico** sobre Catalunya: mapa con delimitaciones municipales, posibilidad de marcar municipios como visitados (hoy solo en memoria del navegador) y modelo de datos para **varias visitas por municipio**, cada una con notas y enlaces a **imágenes o URLs** (sin subida de ficheros todavía).

---

## 2. Stack técnico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js **16** (App Router) |
| Lenguaje | TypeScript (strict) |
| Estilos | Tailwind CSS **4** |
| Base de datos | **PostgreSQL** vía `DATABASE_URL` |
| ORM | **Prisma ORM 7** (`prisma.config.ts`, adaptador `@prisma/adapter-pg` + `pg`) |
| DI (API) | **DIOD** + `reflect-metadata` |
| Mapa | **Leaflet** + **react-leaflet** |
| Reproyección GeoJSON | **proj4** (EPSG:25831 → WGS84) |
| Estado UI (visitas locales) | **Zustand** |
| Tests | **Vitest** (pocas pruebas de ejemplo) |

Scripts útiles (véase `package.json` y `AGENTS.md`):

- `npm run dev` — servidor de desarrollo  
- `npm run prep` — `lint` + `test` + `build`  
- `npm run docker:up` — Postgres en Docker (puerto **15432** mapeado en `docker-compose.yml`)  
- `npm run db:generate` / `db:migrate` / `db:push` — Prisma  

Variables de entorno: **`.env`** con `DATABASE_URL` (plantilla en **`.env.example`**). En Prisma 7 la URL también se usa desde **`prisma.config.ts`** (con fallback de desarrollo para `prisma generate` sin `.env`).

---

## 3. Estructura de carpetas relevante

```
src/
  app/
    layout.tsx          # Layout global + CSS de Leaflet
    page.tsx            # Página principal: mapa + panel (cliente)
    globals.css
    api/
      municipalities/route.ts   # GET listado
      visits/route.ts           # GET por municipio, POST crear visita
  components/
    Map.tsx             # Mapa Leaflet + GeoJSON
    SidePanel.tsx       # Panel lateral selección / “visitat” / notes
  contexts/             # Backend hexagonal / DDD (ver §4)
    shared/
      infrastructure/
        dependency-injection/diod.config.ts
        prisma/PrismaService.ts
        http/HttpNextResponse.ts
    geo-journal/
      municipalities/   # Dominio + aplicación + infra Prisma
      visits/
  lib/
    catalunyaGeoJson.ts   # Reproyección, propiedades CODIMUNI1/2, estilos de tramo
  store/
    useMunicipalities.ts  # Zustand (visited, selected, partner, notas locales)
  types/
    api.ts                # Tipos DTO para body de API

prisma/
  schema.prisma
  migrations/             # Migraciones SQL versionadas
public/
  data/catalunya-municipis.geojson   # Límites (fichero grande, ~35 MB)
  marker-icon*.png, marker-shadow.png
prisma.config.ts
docker-compose.yml
```

No hay `src/server` como capa de negocio: la lógica de aplicación vive en **`src/contexts/`**, según `AGENTS.md`.

---

## 4. Backend y arquitectura

### 4.1 Convenciones

- Rutas **`src/app/api/**/route.ts`**: controladores **finos**; primera línea **`import "reflect-metadata"`**; resuelven casos de uso con **`container.get(...)`** desde `diod.config.ts`; respuestas con **`HttpNextResponse.json`** donde aplica.
- Casos de uso con **`@Service()`**; repositorios abstractos en dominio; implementaciones **Prisma** en infraestructura.
- Cliente Prisma: clase **`PrismaService`** (singleton + pool/pg + adaptador) registrada en DIOD e inyectada en repositorios.

### 4.2 Esquema Prisma (resumen)

- **`Municipality`**: `id` (string, PK, p. ej. código INE), `name`, relación `visits`. Tabla mapeada a **`municipalities`**.
- **`Visit`**: `id` (cuid), `municipalityId`, `visitedAt` (`timestamptz`), `notes` opcional, `media[]`. Tabla **`visits`**.
- **`Media`**: `id` (cuid), `visitId`, `type` (`enum`: `image` | `link`), `url`. Tabla **`media`**.

### 4.3 API HTTP

| Método | Ruta | Comportamiento |
|--------|------|----------------|
| `GET` | `/api/municipalities` | Lista municipios ordenados por nombre (`id`, `name`). Vacío si no hay filas en BD. |
| `GET` | `/api/visits?municipalityId=` | **Obligatorio** `municipalityId`; si falta → 400. Lista visitas con `media`, orden por fecha descendente. |
| `POST` | `/api/visits` | Cuerpo JSON: `municipalityId`, `visitedAt` (ISO), `notes?`, `media?[]` con `{ type, url }`. Si el municipio no existe → **404**. |

**Importante:** en Fase 1 **no hay script de importación** del GeoJSON a la tabla `municipalities`. Hasta que se rellene la BD, `GET /api/municipalities` puede devolver `[]` y `POST /api/visits` fallará con 404 si el `municipalityId` no está insertado.

### 4.4 Detalle de implementación Next / Prisma 7

- **`container.get`** se invoca **dentro de cada handler** de ruta (no a nivel de módulo), para que `next build` no requiera `DATABASE_URL` al analizar el código.
- **`next.config.ts`**: `serverExternalPackages` incluye paquetes nativos relacionados con `pg`/Prisma.

---

## 5. Frontend: mapa y estado local

### 5.1 Datos geográficos

- El fichero **`public/data/catalunya-municipis.geojson`** no se importa en el bundle: se carga en el cliente con **`fetch('/data/catalunya-municipis.geojson’)`** para no hinchar el build.
- El contenido real son **líneas de límite** (`LineString` / `MultiLineString`), no polígonos por municipio. Propiedades relevantes: **`CODIMUNI1`**, **`CODIMUNI2`**, **`IDLINIA`** (línea entre dos municipios).
- Las coordenadas vienen en **EPSG:25831** (metros). Antes de mostrarlas en Leaflet se reproyectan a **WGS84** con **`proj4`** en `catalunyaGeoJson.ts`.

### 5.2 Cómo usar la UI (marcar visitado en Fase 1)

1. Acercar el zoom y **hacer clic en una línea** de límite (el área clicable es la línea).
2. Se abre el **panel derecho** con el código INE del municipio seleccionado (y el vecino del tramo).
3. Botón **“Marcar com a visitat”** añade ese municipio al estado **local** (Zustand), no a la API.
4. **“Canviar a l’altre”** intercambia el municipio activo del panel cuando el clic fue en un límite compartido.
5. Las **notas** del textarea son también **solo en memoria** del navegador hasta que se enlace con Prisma.

### 5.3 Significado de los colores de las líneas

En cada tramo entre municipios **A** y **B**:

- Gris: ninguno marcado como visitado en el store local.
- Amarillo: uno de los dos marcado.
- Verde: ambos marcados (en ese par del tramo).

### 5.4 Otras decisiones de UI

- **`src/app/page.tsx`**: componente cliente con **`dynamic(..., { ssr: false })`** para `Map`, según requisitos de Leaflet en Next 16.
- **`layout.tsx`**: incluye **`leaflet/dist/leaflet.css`**.
- Iconos por defecto de Leaflet: copiados a **`public/`** y ajuste de `L.Icon.Default` en `Map.tsx`.

---

## 6. Qué queda explícitamente fuera de Fase 1

- **Autenticación** de usuarios.
- **Persistencia** de “visitado” o notas desde el mapa hacia **`/api/visits`** (el panel no llama aún a la API).
- **Seed / import** de `Municipality` desde el GeoJSON u otra fuente (los códigos INE del mapa están alineados con la idea de `Municipality.id`, pero hay que cargarlos en BD).
- **Subida** de imágenes (solo URLs en el modelo `Media`).
- Pruebas E2E del mapa o cobertura amplia de dominio.

---

## 7. Cómo validar el proyecto localmente

1. Copiar `.env.example` a `.env` y ajustar `DATABASE_URL` si hace falta.  
2. Levantar Postgres: `npm run docker:up` (o usar tu propia instancia).  
3. Aplicar migraciones: `npx prisma migrate deploy` (o `npm run db:migrate` en desarrollo).  
4. `npm run dev` y abrir la raíz `/`.  
5. Comprobar API: `GET http://localhost:3000/api/municipalities` (tras tener datos), etc.

---

## 8. Referencias internas

- Convenciones de equipo: **`AGENTS.md`**, carpeta **`docs/`** (rutas finas, DIOD, hexagonal, base de datos).
- Guía original del mapa (parcialmente adaptada): **`instrucciones.md`**.

---

*Documento generado para describir el estado “Fase 1” del repositorio. Actualízalo cuando añadas seed, llamadas `fetch` a la API desde el cliente u otras piezas mayores.*
