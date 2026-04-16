Aquí tienes el flujo cada vez que subes una nueva versión (pista de pruebas en Play incluida), alineado con lo que ya está en el README (Part B) y con tu repo.

1. Subir versión en Android (obligatorio)
En android/app/build.gradle, dentro de defaultConfig:

versionCode: entero mayor que el último que ya subiste a Play (si no, Play rechaza el bundle).
versionName: texto que verán los testers (ej. 1.2).
Ejemplo: si Play tiene versionCode 2, pon 3 (o superior).

2. Variables del front embebido en la app
Tienen que estar listas antes del build web:

Fichero .env.capacitor.production en la raíz del repo (copia de scripts/capacitor-build.env.example) con al menos NEXT_PUBLIC_API_URL, auth, privacidad, AdMob si toca.
npm run build:capacitor las carga solas.

3. Generar el web estático y sincronizar Capacitor
En la raíz del proyecto (PowerShell, ruta Windows recomendada):

npm install
npm run build:capacitor
Eso hace el export a out/ y al final ejecuta npx cap sync (mete el web en el proyecto Android). Si solo cambias cosas nativas después, puedes repetir npm run android:sync; no es estrictamente obligatorio si acabas de hacer build:capacitor sin errores.

4. Firma del AAB (contraseña del keystore)
Una de estas dos:

Archivo android/keystore.local.properties (con storePassword / keyPassword), o
Variables en esta misma sesión de terminal antes del paso 5:
$env:ANDROID_KEYSTORE_PASSWORD = "tu_contraseña_del_keystore"
# si la clave del alias es distinta:
# $env:ANDROID_KEY_PASSWORD = "..."
(Si ya tienes keystore.local.properties bien relleno, no hace falta el $env:.)

5. Compilar el AAB de release
Desde la raíz del repo:

cd android
.\gradlew.bat bundleRelease
cd ..
O desde la raíz sin cambiar de carpeta manualmente: npm run android:bundle.

6. Comprobar que el bundle va firmado (recomendado)
jarsigner -verify -verbose:summary "android\app\build\outputs\bundle\release\app-release.aab"
Debe aparecer jar verified. al final.

7. Subir a Google Play Console
Entra en tu app → Testing (interno / cerrado / abierto, el que uses).
Crear nueva versión en esa pista.
Sube solo:
android\app\build\outputs\bundle\release\app-release.aab
Revisa notas de la versión, guarda y sigue el flujo (revisión si aplica).
Resumen rápido
Paso	Qué
1
Subir versionCode / versionName en build.gradle
2
.env.capacitor.production con NEXT_PUBLIC_*
3
npm run build:capacitor
4
Contraseña: keystore.local.properties o $env:ANDROID_KEYSTORE_PASSWORD
5
gradlew.bat bundleRelease (o npm run android:bundle)
6
jarsigner -verify del .aab
7
Subir el .aab en la pista de pruebas
La guía detallada (keystore la primera vez, errores típicos) sigue en el README: «Guia pas a pas: build Android → AAB signat → Google Play», Partes A–C.