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

- **JWT únic** (signatura amb `jose` + `AUTH_SECRET`, caducitat **~30 dies**): una sola identitat; a la **web** el token viatja en cookie **HttpOnly** (mateixa caducitat que el JWT) i, si cal, també es pot enviar **Bearer**; a **Capacitor** (origen creuat respecte a l’API) el token es persisteix amb **`@capacitor/preferences`** i una caché en memòria; a navegador/PWA es fa servir **`localStorage`**; totes les peticions `apiFetch` porten **`Authorization: Bearer`** quan hi ha token (les peticions cross-origin no poden usar la cookie de manera fiable al WebView).
- **Inici de sessió per correu + contrasenya** per a qualsevol usuari amb `passwordHash` a la BD (no només el superadmin de seed), quan el servidor ho permet: `AUTH_ALLOW_CREDENTIALS=true` o **NODE_ENV=development**. Per mostrar el formulari en un build estàtic / Android sense dependre del servidor en temps de build: `NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS=true`.
- **Registre** (opcional): `POST /api/auth/register` (email + contrasenya amb hash bcrypt, rol `user`). El servidor l’accepta si `AUTH_ALLOW_REGISTRATION=true` **o** ja està permès el login per credencials (mateixa lògica que credencials per simplificar ops). Per mostrar la secció «Crear compte» a l’app estàtica: `NEXT_PUBLIC_AUTH_ALLOW_REGISTRATION=true` (o `NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS=true`, que també activa la UI de registre).
- **Tancament de sessió invàlid**: si `GET /api/auth/me` retorna **401**, el client esborra el token persistit (evita bucles amb JWT corrupte).
- **API**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.

### Backend y datos

- **API REST** bajo `src/app/api/`:
  - Municipios (listado enriquecido con nombre y **comarca** cuando el JSON auxiliar está generado).
  - Visitas: listar por municipio, crear, leer una por id, actualizar, borrar.
  - Subida de **imágenes** asociadas a una visita.
  - Servicio de **ficheros subidos** (`/api/uploads/...`) y rutas de autenticación (`/api/auth/*`). Les **imatges internes** es poden veure al client (incloent Capacitor) mitjançant **URL signada**: `GET /api/uploads/[mediaId]/signed-url` (amb sessió) retorna una URL amb `token` temporal; `GET /api/uploads/file/[mediaId]?token=...` serveix el fitxer sense capçalera `Authorization` (el token expira en pocs minuts).
- La lógica de negocio sigue **arquitectura en capas / DDD** en `src/contexts/` (repositorios Prisma, casos de uso, inyección con Diod), descrita en `docs/`.

### Datos auxiliares (comarcas)

- **`municipi-comarca.json`**: relación INE ↔ comarca (nombre y código), generado por script para alimentar la API y el tinte por comarca en el mapa.
- **`catalunya-comarques.geojson`**: polígonos comarcales agregados a partir de municipios (Turf), para la capa de contornos.

Scripts npm (tras tener dependencias instaladas):

```bash
npm run data:comarques           # genera municipi-comarca.json
npm run data:comarques-geojson  # genera catalunya-comarques.geojson
```

## PWA i mode offline

- **Producció**: `npm run build` genera el Service Worker (`public/sw.js`, Workbox). En desenvolupament (`npm run dev`) el SW està desactivat.
- **Visites**: creació, edició i esborrat es poden **desar a IndexedDB (Dexie)** quan no hi ha xarxa; es sincronitzen amb la mateixa API (`/api/visits`, imatges a `/api/visits/[id]/images`) en detectar `online` o amb el botó **«Sincronitzar ara»** al mapa.
- **Imatges offline**: es guarden com a blobs a la taula `pendingImages` i es pugen en ordre després de crear la visita al servidor.
- **Mapa**: les teselles **OpenStreetMap** i els fitxers estàtics sota `/data/*.geojson` es cachegen de forma **dinàmica** mentre s’utilitzen (límit d’entrades conservador). Sense xarxa cal haver visitat abans les zones amb connexió.
- **Comptadors**: l’última resposta vàlida de `GET /api/municipalities` es desa al client per estimar visites si l’API no respon; els canvis pendents de l’outbox s’ajusten al mapa.
- **Proves manuals**: `npm run build && npm start`; Chrome DevTools → Application → **Service Workers** / **Cache storage**; **Mode avió**; tornar a activar la xarxa i comprovar POST/PATCH/DELETE i imatges.
- **Limitacions**: IndexedDB i quota al navegador (i sobretot **Safari iOS**); OAuth requereix xarxa almenys per iniciar sessió.

---

## Requisitos

- Node.js y npm
- Docker (recomendado para Postgres local)

## Puesta en marcha

1. Variables de entorno:

   ```bash
   cp .env.example .env
   ```

   El fitxer [`.env.example`](.env.example) explica **on va cada variable en producció**: variables del **backend** (p. ex. Railway) vs variables **`NEXT_PUBLIC_*`** (només al **build** de l’app Android / export estàtic, incrustades al JS).

   Ajusta `AUTH_SECRET` i, si cal, variables d’autenticació (vegeu llista a sota). La base de datos por defecto apunta a Postgres en el **puerto 15432** (ver `docker compose` si el projecte en defineix un).

   | Variable (servidor) | Efecte |
   |---------------------|--------|
   | `AUTH_SECRET` | Clau per signar JWT (obligatori en producció). |
   | `AUTH_ALLOW_CREDENTIALS` | Si és `true`, habilita `POST /api/auth/login` (i registre si no override) fora de desenvolupament. |
   | `AUTH_ALLOW_REGISTRATION` | Si és `true`, habilita `POST /api/auth/register` encara que `AUTH_ALLOW_CREDENTIALS` no ho estigui (útil per polítiques ops). |

   | Variable pública (build client / Capacitor) | Efecte |
   |---------------------------------------------|--------|
   | `NEXT_PUBLIC_API_URL` | Base URL de l’API (ex. `https://…railway.app`, sense barra final). **Gairebé obligatòria** per a l’app; sense això l’export pot generar-se però l’app no trobarà l’API. |
   | `NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS` | Mostra el formulari de login al front estàtic. |
   | `NEXT_PUBLIC_AUTH_ALLOW_REGISTRATION` | Mostra la UI de «Crear compte» (el servidor ha d’acceptar el registre igualment). |
   | `NEXT_PUBLIC_PRIVACY_POLICY_URL` | URL pública de la política de privacitat (enllaços a la UI; Play Console la demana). |
   | `NEXT_PUBLIC_ADMOB_USE_PRODUCTION_ADS` | Si no és `true`, l’app **sempre** usa l’ID de prova oficial de Google (`ca-app-pub-3940256099942544/5224354917`), encara que `NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID` estigui definit. Evita servir anuncis reals per error en desenvolupament. |
   | `NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID` | Obligatori només quan `NEXT_PUBLIC_ADMOB_USE_PRODUCTION_ADS=true`: ID d’unitat Rewarded de producció a la consola AdMob. Cal `admob_app_id` a `android/.../strings.xml` per al SDK. |

   El script `build:capacitor` posa `CAPACITOR_STATIC=1` tot sol; no cal definir-ho a mà. La llista completa amb **on** es defineix cada cosa (Railway vs màquina de build) és a [`.env.example`](.env.example) (secció C).

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
| `npm run build:capacitor` | Export estàtic (`out/`) per Capacitor (Windows / macOS / Linux). Carrega `.env` i després **`.env.capacitor.production`** si existeix (plantilla: [`scripts/capacitor-build.env.example`](scripts/capacitor-build.env.example)). |
| `npm run build:capacitor:direct` | Mateix build **sense** el carregador d’entorn (només PowerShell a Windows; ús avançat). A Unix: `bash scripts/build-capacitor.sh`. |
| `npm run cap:sync` | Sincronitza Capacitor (totes les plataformes del projecte) |
| `npm run android:sync` | Només Android: regenera `capacitor.settings.gradle` / plugins després de `npm install` o nous paquets `@capacitor/*` |
| `npm run android:bundle` | **Windows:** genera l’**AAB** de release (`android/app/build/outputs/bundle/release/app-release.aab`) per pujar a Google Play. Flux complet: vegeu **«Guia pas a pas: build Android → AAB signat → Google Play»** més avall |
| `npm run android:bundle:unix` | Mateix que l’anterior en macOS/Linux (`./gradlew`) |
| `npm run android:icons` | Icona launcher + splash Android des de `assets/logo.png` (≥1024px; inclou `mipmap-*/ic_launcher_foreground.png` adaptatiu) |
| `npm run android:open` | Obre el projecte a Android Studio |
| `npm run data:visit-static-params` | (Opcional) Escriu `visit-static-params.json` des de la BD per pre-generar URLs de visites a l’export |
| `npm run smoke:railway` | Comprovació ràpida de l’API desplegada (cal `BASE_URL`; vegeu apartat «Smoke tests Railway») |

### Smoke tests Railway (pas 2)

- Automàtic: `BASE_URL=https://el-teu-servei.up.railway.app npm run smoke:railway` — comprova `/api/auth/session`, `/api/municipalities` (esperat **401** sense cookie; és correcte) i `/api/auth/providers`.
- Manual: obre el mateix domini al navegador, fes **login**, i torna a carregar `/api/municipalities` — hauria de ser **200** amb JSON (array).

Les crides a l’API al client usen [`apiFetch` / `apiUrl`](src/lib/apiUrl.ts) amb `NEXT_PUBLIC_API_URL` en el build estàtic; no cal posar `` `${process.env.NEXT_PUBLIC_API_URL}/api/...` `` a mà.

### Dos desplegaments (web estàtica + API)

- **Backend**: mateix projecte, `npm run build` i `npm run start` (o el teu hosting Node). Les rutes `src/app/api/**` i Auth han de ser accessibles a la URL pública (`AUTH_URL`, etc.).
- **Frontend Capacitor / estàtic**: defineix les `NEXT_PUBLIC_*` **abans** de `npm run build:capacitor`. Pots posar-les totes en **`.env.capacitor.production`** (copia de [`scripts/capacitor-build.env.example`](scripts/capacitor-build.env.example)); el comando `build:capacitor` les injecta automàticament. Cal la mateixa base que Railway (**`https://`**, sense barra final). Si el front es servirà des d’un domini diferent al de l’API, configura **`CORS_ALLOWED_ORIGINS`** al servei Railway amb aquest origen (els valors per defecte del middleware ja inclouen `capacitor://localhost` i `https://localhost`).
- **Login des de l’app Android** (UI estàtica + API a Railway): defineix `NEXT_PUBLIC_API_URL` i, per mostrar el formulari, `NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS=true`. Al servidor cal `AUTH_ALLOW_CREDENTIALS=true` perquè `POST /api/auth/login` (i, per defecte, també el registre) estiguin habilitats. Opcional: **`AUTH_CROSS_SITE_COOKIES=true`** si vols que la cookie HttpOnly de la mateixa sessió funcioni bé en alguns fluxos web cross-origin (el camí principal a Capacitor és **Bearer + Preferences**, no la cookie). Per **registre obert** sense depèndre de `AUTH_ALLOW_CREDENTIALS`: `AUTH_ALLOW_REGISTRATION=true` i, a la UI estàtica, `NEXT_PUBLIC_AUTH_ALLOW_REGISTRATION=true`. La BD pot tenir l’usuari de desenvolupament sembrat (`db:seed`); email del superadmin de seed: `dev-superadmin@local.dev` (vegeu `scripts/seed-dev-superadmin.ts`).
- Per enllaços directes a **totes** les visites en HTML estàtic, executa `npm run data:visit-static-params` abans de `npm run build:capacitor` (requereix BD); sense això només es genera una ruta “shell” per municipi.

## Arquitectura (resumen)

- **Frontend**: `src/app/` (App Router), componentes en `src/components/`, estado del mapa con Zustand (`src/store/`): municipios seleccionados, refresco tras cambios, preferencias de mapa (OSM / solo municipios / contornos comarca).
- **API**: `src/app/api/`.
- **Dominio y aplicación**: `src/contexts/` (patrones descritos en `docs/`).
- **Base de datos**: Prisma (`prisma/schema.prisma`); modelos principales: `User`, `Municipality`, `Visit` y medios asociados.

Para convenciones detalladas (API, inyección de dependencias con Diod, pruebas, estilo), usa el mapa de `docs/` que aparece en `AGENTS.md`; no hace falta leer toda la documentación de entrada.

## Stack principal

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Leaflet / react-leaflet, Prisma 7, PostgreSQL, JWT (`jose`), Vitest, Turf (scripts de datos).

## Despliegue

Cualquier plataforma compatible con Next.js (por ejemplo Vercel). En producción configura `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` y las credenciales OAuth necesarias. Asegúrate de persistir o servir correctamente el almacenamiento de **uploads** según cómo montes el despliegue.

Si publicas també una **app Capacitor**, el servidor API ha de continuar accessible per HTTPS (o la xarxa que faci servir l’emulador/dispositiu) i cal definir `NEXT_PUBLIC_API_URL` en el build del front estàtic; vegeu la taula i el bloc «Dos desplegaments» més amunt.

## Capacitor i Android (recomanat: tot en Windows)

Per evitar conflictes de binaris natius (p. ex. **lightningcss** amb Tailwind 4) i simplificar Gradle/SDK:

1. Clona o mantén el repo en un camí Windows (p. ex. `C:\Users\...\municipis-cat`).
2. A l’arrel del projecte: `npm install`, prepara **`.env.capacitor.production`** (copia [`scripts/capacitor-build.env.example`](scripts/capacitor-build.env.example)) amb les teves `NEXT_PUBLIC_*` i executa `npm run build:capacitor` (carrega aquests fitxers i després invoca el script d’export). Si vols el formulari de login per contrasenya a l’app: al **build** inclou `NEXT_PUBLIC_AUTH_ALLOW_CREDENTIALS=true` (i, si vols «Crear compte», `NEXT_PUBLIC_AUTH_ALLOW_REGISTRATION=true`); al **servidor** Railway cal `AUTH_ALLOW_CREDENTIALS=true` i/o `AUTH_ALLOW_REGISTRATION=true` segons el flux. Després de `npm install`, si afegim plugins Capacitor (p. ex. `@capacitor/preferences` per al JWT), executa `npm run android:sync` (o `npm run cap:sync`) abans de compilar al dispositiu.
3. Obre la carpeta **`android`** amb **Android Studio** a Windows; configura `android/local.properties` (vegeu `android/local.properties.example`) amb `sdk.dir` en ruta Windows.
4. Si `cap open android` no troba Studio, obre el projecte manualment des de **File → Open → android**.

A macOS/Linux el mateix `npm run build:capacitor` funciona (Node + `bash scripts/build-capacitor.sh`). L’alias `npm run build:capacitor:unix` fa el mateix.

### AdMob: anuncis de prova vs producció

- Per defecte el client usa l’**ID de prova** de rewarded de Google (`ca-app-pub-3940256099942544/5224354917`). Per servir l’unitat de **producció**, cal definir `NEXT_PUBLIC_ADMOB_USE_PRODUCTION_ADS=true` i `NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID` amb el teu ID de consola; després `npm run build:capacitor` i `npx cap sync android`.
- El plugin `@capacitor-community/admob` amb `isTesting: true` sol·licita l’ID de mostra; si registres el dispositiu com a **test device** a AdMob, el SDK pot usar l’`adId` real per a proves (veure documentació d’AdMob «test devices»). Per a desenvolupament diari, deixa el flag de producció desactivat.

### Google Play Console (Data Safety, Advertising ID)

- El manifest declara `com.google.android.gms.permission.AD_ID` (necessari per anuncis personalitzats / AdMob amb **Advertising ID**).
- Les versions de **`com.google.android.gms:play-services-ads`** i **`user-messaging-platform`** es defineixen a `android/variables.gradle` i es reutilitzen via `android/gradle.properties` (vegeu també el mòdul `node_modules/@capacitor-community/admob/android/build.gradle`).
- A **Play Console → Política de l’app → Seguretat de les dades (Data Safety)**, declara de manera coherent l’ús de dades per a publicitat: si l’app fa servir l’**Advertising ID** (p. ex. AdMob), indica **Sí** on correspongui (p. ex. «IDs d’publicitat o dispositiu» / Advertising ID), juntament amb el propòsit (publicitat o màrqueting) i la base legal adequada. Alinea-ho amb el que recull la política de privacitat (`NEXT_PUBLIC_PRIVACY_POLICY_URL`).

### Guia pas a pas: build Android → AAB signat → Google Play

Aquest és el flux complet (Capacitor + Next export estàtic + Gradle). Segueix l’ordre; la majoria dels errors venen de **saltar passos** o de **pujar un AAB sense firma**.

---

#### Part A — Una sola vegada (keystore i entorn)

1. **Requisits:** Node.js i npm, Android SDK (via Android Studio), JDK 21 alineat amb el projecte. A Windows, treballa en un camí tipus `C:\Users\...\municipis-cat` (evita barrejar `node_modules` entre WSL i Windows).

2. **Dependències i API:** A l’arrel del repo: `npm install`. Per l’app que parla amb Railway, defineix `NEXT_PUBLIC_API_URL` (i la resta de variables del README) **abans** del `build:capacitor`.

3. **Generar el keystore d’upload** (no es puja a git; el `.jks` està al `.gitignore`). Des de la carpeta `android/`:
   ```bash
   keytool -genkey -v -keystore upload-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
   - Quan demani **Enter keystore password**, és la contrasenya que **tu triïs** (no ve donada). La recordaràs per Gradle i per fer còpies de seguretat del fitxer.
   - Deixa el `.jks` a `android/upload-key.jks` (o canvia el nom i actualitza `storeFile` a `android/keystore.properties`).

4. **Contrasenyes per a Gradle** (no van al repositori). Tria **una** d’aquestes opcions:
   - **Fitxer local:** copia `android/keystore.local.properties.example` → `android/keystore.local.properties` i omple `storePassword` i `keyPassword` (sovint iguals). Aquest fitxer **no es versiona**.
   - **Variables d’entorn** (PowerShell abans de `gradlew`):
     ```powershell
     $env:ANDROID_KEYSTORE_PASSWORD = "la_mateixa_que_al_keytool"
     # opcional si la key té altra clau:
     $env:ANDROID_KEY_PASSWORD = "..."
     ```

5. **Fitxers de firma al repo:** `android/keystore.properties` ja inclou `storeFile=upload-key.jks` i `keyAlias=upload` (sense secrets). Si `bundleRelease` no té contrasenya configurada, Gradle **atura el build** amb un missatge explícit (això evita generar un AAB buit de firma sense adonar-te’n).

6. **Play Console (primera publicació):** crea l’aplicació, activa **Play App Signing** i segueix el flux per registrar la **clau de pujada** (normalment el certificat del teu `upload-key.jks`). Google re-signa el que instal·len els usuaris; **tu sempre signes l’upload** amb aquest keystore. Guarda el `.jks` i les contrasenyes en lloc segur (còpia fora del disc del PC).

---

#### Part B — Cada versió que vols pujar a Play

1. **Augmentar la versió (obligatori abans de cada pujada):** a `android/app/build.gradle`, dins de `defaultConfig { ... }`, actualitza **`versionCode`** i **`versionName`**. Google Play exigeix que **`versionCode`** sigui un enter **sempre més gran** que el de la darrera release publicada (si no, rebutja el bundle). **`versionName`** és el text visible per als usuaris (p. ex. `"1.2"`); convé alinear-lo amb el canvi de versió.
   ```gradle
   defaultConfig {
       // ...
       versionCode 3        // incrementa +1 (o més) respecte a l’anterior
       versionName "1.2"    // opcional però recomanable actualitzar-lo
   }
   ```

2. **Web estàtic per a Capacitor** (a l’arrel del repo):
   ```bash
   npm run build:capacitor
   ```

3. **Sincronitzar Capacitor:** `npm run build:capacitor` ja acaba amb `npx cap sync`. Només cal `npm run android:sync` si després has canviat plugins o versions `@capacitor/*` sense tornar a fer el build web.

4. **Contrasenyes de firma (upload keystore) — Gradle les necessita per signar el `.aab`**

   Google Play només accepta un bundle **signat** amb la teva **upload key** (el fitxer `.jks` que vas crear amb `keytool`, p. ex. `android/upload-key.jks`). El projecte ja indica **ruta del `.jks` i alias** a `android/keystore.properties` (sense secrets). **Falta donar les contrasenyes**, d’una d’aquestes formes (tria **una**):

   - **Opció A — Fitxer local (còmode si compiles sovint)**  
     1. Copia `android/keystore.local.properties.example` → `android/keystore.local.properties`.  
     2. Omple `storePassword` i `keyPassword`:
       - **`storePassword`**: la contrasenya del **fitxer** `.jks` (la que vas posar quan vas crear el keystore amb `keytool`).
       - **`keyPassword`**: normalment **la mateixa**; només canvia si en crear el keystore vas definir una contrasenya **diferent** per a la clau de l’alias (pregunta opcional de `keytool`).
     3. Aquest fitxer **no es versiona** (gitignore). Amb això no cal definir res més a la terminal abans de `bundleRelease`.

   - **Opció B — Variables d’entorn (sense guardar la contrasenya en un fitxer al disc)**  
     A la **mateixa sessió de PowerShell** on executaràs Gradle, **abans** de `gradlew bundleRelease`:

     ```powershell
     $env:ANDROID_KEYSTORE_PASSWORD = "la_contrasenya_del_fitxer_jks"
     ```

     Si la clau de l’alias té contrasenya **diferent** de la del keystore:

     ```powershell
     $env:ANDROID_KEY_PASSWORD = "la_contrasenya_de_la_key"
     ```

     (`ANDROID_KEY_PASSWORD` és opcional si és igual que la del store.)

   Sense **A** o **B**, Gradle atura el build amb un missatge explícit (no es genera un AAB vàlid per pujar). Més detall: **Part A, pas 4**.

5. **Generar l’AAB de release** (Windows):
   ```bash
   cd android
   .\gradlew.bat bundleRelease
   ```
   macOS/Linux: `./gradlew bundleRelease` o des de l’arrel `npm run android:bundle:unix`.

6. **Artifact resultant:**  
   `android/app/build/outputs/bundle/release/app-release.aab`  
   Aquest és el fitxer que has de **pujar a Play Console** (Production o testing intern/closed). No facis servir builds **debug** per publicar.

7. **Comprovar que el bundle va signat** (recomanat abans de pujar):
   ```powershell
   jarsigner -verify -verbose:summary "android\app\build\outputs\bundle\release\app-release.aab"
   ```
   Has de veure **`jar verified.`** al final. Els avisos de certificat **autofirmat** o cadena PKIX són normals amb un keystore propi; no impedeixen Play si la upload key coincideix amb la registrada.

8. **A Play Console:** crea una nova release al track que toqui, puja **només** aquest `.aab` i envia a revisió quan correspongui.

---

#### Part C — Errors freqüents

| Símptoma | Causa probable | Què fer |
|----------|----------------|---------|
| **«All uploaded bundles must be signed»** | L’AAB no està signat amb la teva upload key (o has pujat un altre artefacte). | Assegura’t de tenir contrasenya (fitxer local o env), torna `bundleRelease`, verifica amb `jarsigner`. |
| Gradle para amb missatge de **firma / contrasenya** | Falta `ANDROID_KEYSTORE_PASSWORD` o `keystore.local.properties`. | Part A, pas 4. |
| `BUILD SUCCESSFUL` però Play rebutja | Abans el projecte podia generar release sense signar; ara el build falla si no hi ha contrasenya. | Torna a generar amb firma i revisa el path de l’`.aab`. |
| Compilació Android del plugin IAP | Error de `notifyListeners` (protected). | Vegeu Part D. |

**Play App Signing:** Google pot re-signar l’app per als usuaris; **tu igual has de signar** el que puges. Si perds el `.jks` o les contrasenyes després de publicar, el camí és el **restabliment de clau de subida** a Play, no recuperar el fitxer des del codi.

---

#### Part D — Parche npm: `@adplorg/capacitor-in-app-purchase`

El plugin d’IAP pot **no compilar** a Android perquè crida `notifyListeners` des d’una classe que no és subclasse de `Plugin` (mètode `protected`). El repo inclou un **parche** (`patches/@adplorg+capacitor-in-app-purchase+*.patch`) que ho arregla. Es reaplica amb **`patch-package`** al `postinstall` (`prisma generate && patch-package`). Si actualitzes la versió del paquet npm, cal tornar a generar el parche: `npx patch-package @adplorg/capacitor-in-app-purchase` després d’editar `node_modules` si cal.

## WSL (Ubuntu) + Android Studio en Windows (opcional)

Si el codi viu **dins WSL** i Android Studio a Windows, cal alinear `node_modules` amb el SO on corre el build: des de WSL, `rm -rf node_modules && npm install` i després `npm run build:capacitor`; **no** barregis `npm install` a Windows amb el build des de WSL. Alternativa més simple: mou el treball Android al disc Windows (secció anterior).

Abans es podia construir amb **WSL** i obrir `android` des de Studio a Windows; això encara és possible però té més punts de fricció:

### Abrir el proyecto Android (sin depender de `cap open`)

El comando `npm run android:open` (`cap open android`) intenta lanzar Android Studio con la ruta **Linux** (`studio.sh`). Si Studio **solo** está en Windows, fallará con un mensaje tipo «Unable to launch Android Studio».

**Qué hacer:**

1. Abre **Android Studio en Windows**.
2. **File → Open** y elige la carpeta **`android`** del repositorio, accediendo al disco de WSL, por ejemplo:
   - `\\wsl.localhost\Ubuntu-22.04\root\eurega\catalunya-map\android`
   - o `\\wsl$\Ubuntu-22.04\root\eurega\catalunya-map\android`  
   (ajusta el nombre de la distro y la ruta si procede).

Opcional desde WSL: apuntar al ejecutable de Studio (no siempre funciona según la versión):

```bash
export CAPACITOR_ANDROID_STUDIO_PATH="/mnt/c/Program Files/Android/Android Studio/bin/studio64.exe"
```

(Ajusta la ruta si Android Studio está en otra carpeta.)

### Error de Gradle: «Gradle JVM option is incorrect … Use the JDK installed on the same WSL distribution»

Ocurre cuando el código Gradle está en el **sistema de archivos de WSL** (`\\wsl.localhost\...`) y Android Studio intenta usar el **JBR** de Windows (`C:\Program Files\Android\Android Studio\jbr`) de forma incoherente con ese proyecto.

**Paso 1 — JDK dentro de WSL** (terminal Ubuntu):

```bash
sudo apt update
sudo apt install openjdk-17-jdk   # u openjdk-21-jdk si tu Android Gradle Plugin lo requiere
```

La carpeta del JDK suele ser algo como `/usr/lib/jvm/java-17-openjdk-amd64`.

**Paso 2 — Android Studio (Windows)**  
**Settings** → **Build, Execution, Deployment** → **Build Tools** → **Gradle** → **Gradle JDK** → **Add JDK** y usa el mismo JDK vía ruta UNC, por ejemplo:

`\\wsl.localhost\Ubuntu-22.04\usr\lib\jvm\java-17-openjdk-amd64`

Después **Sync Project with Gradle Files**.

**Paso 3**  
Si en `android/gradle.properties` (o en configuración de usuario) existe `org.gradle.java.home=` apuntando a `C:\Program Files\Android\Android Studio\jbr`, quítalo o cámbialo por la ruta del JDK de WSL (misma idea en UNC); eso a menudo fuerza el conflicto.

**Alternativa**  
Tener el repo bajo **`/mnt/c/...`** desde WSL hace que Windows vea rutas `C:\...` y a veces simplifica Gradle y Studio; es preferencia (el rendimiento en `/mnt/c` desde WSL puede ser peor que en el home nativo de la distro).

### `local.properties`, Java 21 y licencias del SDK

- Crea **`android/local.properties`** (no se versiona; hay plantilla en `android/local.properties.example`) con  
  `sdk.dir=/mnt/c/TU_USUARIO/AppData/Local/Android/Sdk`  
  Rutas `C:\...` en ese archivo suelen fallar si ejecutas **`./gradlew` dentro de WSL**.
- El módulo Android usa **Java 21** en `compileOptions`; en Android Studio: **Gradle JDK** = 21 (JBR 21 del IDE u OpenJDK 21). En WSL: `sudo apt install openjdk-21-jdk` si vas a compilar solo por terminal.
- Comprueba que Gradle ve el proyecto: `./gradlew projects` desde `android/`. Si el error habla de **licencias del SDK no aceptadas**, en Windows: abre Android Studio → SDK Manager o ejecuta `sdkmanager --licenses` en el `cmdline-tools` del SDK; acepta las licencias y vuelve a sincronizar.

**Sync en Studio dice “failed” pero no enseña el log:** abre la **Terminal** integrada (pestaña inferior). Desde la **raíz del repo** (`catalunya-map/`, on `\\wsl$\...\catalunya-map`):

```bash
cd android && ./gradlew tasks --stacktrace --info
```

Si la terminal ya está en la carpeta **`android/`**, no hagas `cd android` otra vez; ejecuta solo `./gradlew tasks --stacktrace --info`. El comando lista tareas al final; cualquier `FAILURE:` / `ERROR:` o `Caused by:` al principio o al final del log es lo que hay que copiar. En esta máquina de desarrollo ese comando acaba en `BUILD SUCCESSFUL` si el SDK y el `local.properties` cuadran.
