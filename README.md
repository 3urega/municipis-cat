# Catalunya Map

Aplicación web con **mapa interactivo de los municipios de Cataluña** (Leaflet + GeoJSON). Cada usuario autenticado puede **llevar un diario de visitas** por municipio: fechas, notas e **imágenes** enlazadas, con datos persistentes en **PostgreSQL** (Prisma). La interfaz está mayormente en **catalán**.

---

## Qué hace la aplicación (funcionalidad)

### Mapa principal (`/`)

- **Polígonos municipales**: se cargan desde `public/data/catalunya-municipis.geojson`. Las coordenadas se **normalizan a WGS84** (si el dataset viene en UTM ETRS89 se reproyecta con proj4).
- **Colores**: cada municipio se colorea según el **número de visitas** registradas por el usuario conectado. Los municipios sin visitas pueden usar un **matiz por comarca** (ver datos auxiliares más abajo).
- **Estadística en la parte superior**: texto del estilo **«X visitats de Y (Z%)»**, donde *X* es el número de municipios con al menos una visita, *Y* el total de municipios en el mapa, y *Z* el porcentaje (con **decimal** cuando el redondeo entero sería 0 % pero hay visitas, p. ej. 4/947 → 0,4 %).
- **Selección de municipio**: al hacer clic en un polígono se abre un **panel lateral** con el nombre, el código INE (con correspondencia flexible de ceros a la izquierda respecto a la API), la **comarca** si está disponible, enlace a la página del municipio y el historial de visitas.
- **Encuadre automático**: al seleccionar un municipio el mapa hace **zoom acotado** al polígono (`fitBounds`), con margen que compensa el panel lateral.
- **Marcar com a visitat**: desde el panel se crea una visita con la fecha/hora actual y las **notas** opcionales del cuadro de texto; tras guardar, la app **navega a la página del municipio** con la visita recién creada **ya en modo edición** (query `editVisit`) y hace scroll al formulario para poder añadir imágenes o afinar datos.
- **Vistas de mapa** (controles en la UI):
  - **Mapa OSM**: teselas de OpenStreetMap debajo de los municipios.
  - **Només municipis**: solo polígonos, sin teselas (mapa limpio).
- **Contornos de comarca** (opcional): capa GeoJSON de límites comarcales (`public/data/catalunya-comarques.geojson`) superpuesta **sin relleno** y no interactiva, para orientación geográfica.

### Página de municipio (`/municipality/[municipalityId]`)

- **Cabecera** con nombre, comarca, código INE y enlace para volver al mapa.
- **Migas de pan** (`MapBreadcrumb`) para situarse en la jerarquía mapa → municipio.
- **Muro de notas** (`MunicipalityPostItWall`): tarjetas tipo post-it, una por visita; clic para abrir un **modal de resumen** con fecha, notas y miniaturas de imágenes.
- **Des del modal**: enlaces para **ver la visita en página completa** o pasar al **modo edición** en la misma página.
- **Formulario de visita** (`VisitEditorForm`): crear nueva visita o **editar** una existente (fecha, notas, subida de imágenes vía API, guardar y borrar visita). El bloque tiene `id="visit-editor"` para el scroll cuando entras con `?editVisit=…` (el parámetro se **elimina de la URL** tras aplicarlo, para no ensuciar el marcador).

### Página de detalle de visita (`/municipality/[municipalityId]/visit/[visitId]`)

- Vista **solo lectura** pensada para revisar una visita: notas, **galería de imágenes**, **lightbox** a pantalla completa (teclado Esc/flechas), y posibilidad de **descargar** imágenes.
- Migas de pan para volver al municipio o al mapa.

### Autenticación

- **Auth.js v5**: en producción/despliegue típico **OAuth con GitHub**.
- En **desarrollo**, el proyecto puede usar también **inicio de sesión por credenciales** (usuario/contraseña de prueba creados con el seed); detalles y variables en **`.env.example`**.

### Backend y datos

- **API REST** bajo `src/app/api/`:
  - Municipios (listado enriquecido con nombre y **comarca** cuando el JSON auxiliar está generado).
  - Visitas: listar por municipio, crear, leer una por id, actualizar, borrar.
  - Subida de **imágenes** asociadas a una visita.
  - Servicio de **ficheros subidos** (`/api/uploads/...`) y ruta de Auth.
- La lógica de negocio sigue **arquitectura en capas / DDD** en `src/contexts/` (repositorios Prisma, casos de uso, inyección con Diod), descrita en `docs/`.

### Datos auxiliares (comarcas)

- **`municipi-comarca.json`**: relación INE ↔ comarca (nombre y código), generado por script para alimentar la API y el tinte por comarca en el mapa.
- **`catalunya-comarques.geojson`**: polígonos comarcales agregados a partir de municipios (Turf), para la capa de contornos.

Scripts npm (tras tener dependencias instaladas):

```bash
npm run data:comarques           # genera municipi-comarca.json
npm run data:comarques-geojson  # genera catalunya-comarques.geojson
```

---

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

4. (Opcional) Regenerar datos de comarcas para el mapa y la API:

   ```bash
   npm run data:comarques
   npm run data:comarques-geojson
   ```

5. Desarrollo:

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
| `npm run data:comarques` | JSON INE ↔ comarca |
| `npm run data:comarques-geojson` | GeoJSON de límites comarcales |

## Arquitectura (resumen)

- **Frontend**: `src/app/` (App Router), componentes en `src/components/`, estado del mapa con Zustand (`src/store/`): municipios seleccionados, refresco tras cambios, preferencias de mapa (OSM / solo municipios / contornos comarca).
- **API**: `src/app/api/`.
- **Dominio y aplicación**: `src/contexts/` (patrones descritos en `docs/`).
- **Base de datos**: Prisma (`prisma/schema.prisma`); modelos principales: `User`, `Municipality`, `Visit` y medios asociados.

Para convenciones detalladas (API, inyección de dependencias con Diod, pruebas, estilo), usa el mapa de `docs/` que aparece en `AGENTS.md`; no hace falta leer toda la documentación de entrada.

## Stack principal

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Leaflet / react-leaflet, Prisma 7, PostgreSQL, Auth.js, Vitest, Turf (scripts de datos).

## Despliegue

Cualquier plataforma compatible con Next.js (por ejemplo Vercel). En producción configura `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` y las credenciales OAuth necesarias. Asegúrate de persistir o servir correctamente el almacenamiento de **uploads** según cómo montes el despliegue.
