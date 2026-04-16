# Resumen para agente / plantilla de proyecto (Geodiari / municipis-cat)

Este documento recoge lo acordado e implementado en el hilo de trabajo sobre **AdMob**, **variables de entorno**, **build Capacitor**, **documentación** y **firma Android**, para poder **replicar o adaptar** el mismo en un *project template*.

---

## 1. AdMob Rewarded (Capacitor Android)

### Enfoque

- **No** se duplicó una capa Java/Kotlin propia con `RewardedAd.load`: ya existe **`@capacitor-community/admob`**, que internamente hace `MobileAds.initialize`, carga de rewarded, `FullScreenContentCallback` y recompensa solo en el callback correcto.
- La política de negocio (límite de municipios) sigue en **servidor**: `POST /api/rewards/admob` solo tras el evento `Rewarded` del plugin (no recompensas falsas en cliente).

### Implementación en TypeScript

- Archivo principal: `src/lib/rewards/admobRewardVideo.ts`.
- Función **`isAdMobProductionRewardUnitsEnabled()`** (nombre sin prefijo `use` para no chocar con ESLint `react-hooks/rules-of-hooks`).
- **Por defecto siempre anuncios de prueba** (ID oficial Google `ca-app-pub-3940256099942544/5224354917`) + `isTesting: true` en `prepareRewardVideoAd`.
- **Producción real** solo si **`NEXT_PUBLIC_ADMOB_USE_PRODUCTION_ADS=true`** (string exacto) **y** está definido **`NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID`**; entonces `isTesting: false`. Si falta el ID con el flag activo → resultado `config_error`.
- Logs con prefijo **`[AdMob]`**; listeners a `Loaded`, `FailedToLoad`, `Showed` para depuración.
- UI: `src/components/rewards/RewardAdsMunicipalityPanel.tsx` — mensajes para `load_failed`, `show_failed`, `config_error` y `server_error`.

### Android (auditoría)

- `AndroidManifest.xml`: `AD_ID`, `INTERNET`, `meta-data` `APPLICATION_ID` → `@string/admob_app_id`.
- `android/app/src/main/res/values/strings.xml`: `admob_app_id` = App ID de consola (`ca-app-pub-…~…`).
- SDK: `play-services-ads` vía el módulo del plugin; versión pin en `android/variables.gradle` (`playServicesAdsVersion`).

### Variables documentadas

- `NEXT_PUBLIC_ADMOB_USE_PRODUCTION_ADS`
- `NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID` (solo con flag de producción)

---

## 2. Variables de entorno — orden y claridad

### Problema

Todo mezclado en `.env.example` sin distinguir **dónde** vive cada cosa en producción.

### Solución

- **`.env.example`** reestructurado con:
  - **Mapa ASCII** al inicio: backend (Railway) vs `NEXT_PUBLIC_*` (build APK) vs desarrollo local.
  - Secciones **A–F**: local, solo backend, front compilado, Google Play servidor, seed Play review, opcionales (OAuth, smoke tests, etc.).
- Texto del mapa en **castellano** para legibilidad; comentarios técnicos alineados con el equipo.

### Regla clave para plantillas

| Dónde | Qué variables |
|--------|----------------|
| **Railway / API** | `DATABASE_URL`, `AUTH_*`, `CORS_*`, `GOOGLE_PLAY_*` servidor, etc. **Sin** `NEXT_PUBLIC_` |
| **Máquina o CI que ejecuta `build:capacitor`** | Solo **`NEXT_PUBLIC_*`** (quedan en el JS del `out/`, públicas en el APK) |
| **Local `npm run dev`** | Un `.env` puede mezclar ambas para comodidad |

---

## 3. Script de build Capacitor con env de producción

### Archivos

- `scripts/run-capacitor-build.mjs`: carga **`dotenv`** en este orden: `.env` (si existe) → **`.env.capacitor.production`** (si existe, `override: true`), luego ejecuta el script existente (`build-capacitor.ps1` / `build-capacitor.sh`).
- `scripts/capacitor-build.env.example`: plantilla **versionada** con las `NEXT_PUBLIC_*` típicas (nombre sin `.env` en el ejemplo para no chocar con reglas de gitignore del template si aplica).

### `package.json`

- `build:capacitor` → `node scripts/run-capacitor-build.mjs`
- `build:capacitor:direct` → PowerShell directo **sin** cargador de env (casos avanzados / Windows)
- `build:capacitor:unix` → mismo entrypoint Node (macOS/Linux)

### Ubicación del fichero real

- **`.env.capacitor.production`** en la **raíz del repo** (junto a `package.json`). Está ignorado por el patrón `.env*` del `.gitignore` (salvo excepciones como `.env.example`).

---

## 4. README y tabla de variables de build

- Tabla **“Variable pública (build client / Capacitor)”** ampliada con **`NEXT_PUBLIC_PRIVACY_POLICY_URL`** (antes faltaba).
- Nota de que **`CAPACITOR_STATIC=1`** lo pone el script de build, no hace falta definirla a mano.
- Enlace explícito a **`.env.example`** como mapa backend vs front.
- Sección **AdMob** (prueba vs producción) y referencia al fichero `.env.capacitor.production`.
- Tabla de comandos: `build:capacitor` describe el cargador de env; `build:capacitor:direct` sin cargador.
- Texto **“Dos desplegaments”** actualizado para mencionar `.env.capacitor.production`.
- Guía **Capacitor**: pasos alineados con el nuevo flujo (copiar plantilla, `build:capacitor`).
- **AGENTS.md**: snippet de `package.json` actualizado para no quedar obsoleto.

---

## 5. Firma del AAB — documentación ampliada (paso 4 Part B)

### Problema

El paso “pon contraseña del keystore” era demasiado escueto.

### Solución en README (Part B)

- Paso 3 aclarado: `npm run build:capacitor` ya hace `npx cap sync`; `android:sync` extra solo si se cambian plugins sin rehacer el build web.
- Paso 4 desarrollado con:
  - **Opción A**: `android/keystore.local.properties` (copia del example), `storePassword` / `keyPassword` explicados.
  - **Opción B**: PowerShell `$env:ANDROID_KEYSTORE_PASSWORD` y opcional `$env:ANDROID_KEY_PASSWORD`.
- Referencia cruzada a Part A paso 4.

### `android/keystore.local.properties.example`

- Comentarios ampliados: qué es cada contraseña, alternativa con variables de entorno.

### Ubicación del fichero real

- **`android/keystore.local.properties`** en la carpeta **`android/`** (mismo nivel que `keystore.properties`), **no** dentro de `android/app/`.

---

## 6. Flujo de release AAB (resumen operativo)

Documentado para el usuario en conversación; debe vivir también en README Part B:

1. Subir **`versionCode`** / **`versionName`** en `android/app/build.gradle`.
2. Tener **`.env.capacitor.production`** con `NEXT_PUBLIC_*` correctas.
3. `npm run build:capacitor`.
4. Contraseñas de firma: fichero local **o** variables de entorno.
5. `gradlew bundleRelease` (o `npm run android:bundle`).
6. Verificar con `jarsigner`.
7. Subir `app-release.aab` en Play Console.

---

## 7. FAQ resuelta en el chat (útil para plantilla)

- **App ID AdMob** en `strings.xml` + manifest; **unidad rewarded de producción** solo vía `NEXT_PUBLIC_*` con flag explícito.
- **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`**: opcional hasta que el backend valide compras Play (Railway); la app puede funcionar sin ella.
- **`AUTH_SECRET`**: generar con `openssl rand -base64 32` o Node `crypto.randomBytes(32).toString('base64')`; nunca commitear.
- **Versión nueva en Play**: solo `android/app/build.gradle` (`versionCode` obligatorio incremental).

---

## 8. Checklist para portar a un *template*

- [ ] Plugin AdMob Capacitor + política test/prod con variables `NEXT_PUBLIC_*` + gating explícito.
- [ ] `.env.example` con mapa backend / front / local.
- [ ] `run-capacitor-build.mjs` + `capacitor-build.env.example` + scripts npm.
- [ ] README: tabla `NEXT_PUBLIC_*` completa (incl. privacidad), nota `CAPACITOR_STATIC`, guía AAB y firma (opciones A/B).
- [ ] `keystore.local.properties.example` + ruta clara (`android/`).
- [ ] `.gitignore` que ignore secretos pero permita `*.example` donde corresponda.

---

*Generado como memoria de transferencia para otro agente; el código fuente de verdad sigue en los archivos citados.*
