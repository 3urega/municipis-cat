# Instruccions per al revisor — Google Play (Catalunya Map / diari de visites)

## Resum

Aplicació amb **mapa de Catalunya** i **diari de visites per usuari** (notes i fotos). Cal compte per crear visites i pujar imatges. El **Premium** (més emmagatzematge) es compra amb **Google Play Billing** a Android.

## Com iniciar sessió

1. Obre l’app i ves a **Iniciar sessió**.  
2. Usa les credencials que l’equip de desenvolupament ha indicat a **Google Play Console** (apartat d’instruccions de verificació / testing).  
   - No es publiquen aquí per seguretat; vegeu la plantilla a [`test-credentials.md`](test-credentials.md) per a l’equip.

**Requisits del servidor:** l’API ha d’estar en línia (URL configurada al build de l’app). Si el login falla amb missatge de xarxa o servidor, comprova connexió o torna-ho a provar més tard.

## Flux a provar (ordre recomanat)

### 1. Login

- Inicia sessió amb el compte de prova.  
- Esperat: es mostra el mapa o la pantalla principal sense bloqueig.

### 2. Crear visita

- Al mapa, selecciona un municipi (toc al polígon).  
- Opció per **marcar com a visitat** o obre la pàgina del municipi i crea/edita una visita amb **data** i opcionalment **notes**.  
- Desa la visita.  
- Esperat: confirmació o retorn al llistat; sense pantalla en blanc.

### 3. Pujar imatge

- Obre una visita en edició.  
- **Galeria** o **Fer foto** (si es demana permís de càmera o fotos, és esperat).  
- Selecciona o fes una foto vàlida (JPEG/PNG/WebP, límit de mida per fitxer segons l’app).  
- Desa la visita amb les imatges.  
- Esperat: miniatures visibles; errors mostrats com a text clar si falla la xarxa o la quota.

### 4. Mapa

- Torna al mapa; comprova que el municipi visitat reflecteix l’estat (p. ex. color / comptador segons disseny actual).  
- Esperat: mapa interactiu sense tancament inesperat de l’app.

### 5. Premium (Android, mode de proves de facturació)

- Obre **Premium** des del menú (si està disponible a la teva build).  
- Esperat: es mostra informació de producte / preu (quan Google Play respon).  
- Opcional: comprova **Restaurar compres** si hi ha una subscripció de prova activa al compte de prova de Google.  
- Les compres reals de prova segueixen les regles de **licències de prova** de Google Play.

## Permisos

- **Càmera / fotos:** s’utilitzen només per **adjuntar fotos a les visites** i emmagatzemar-les al servidor vinculades al teu compte. Abans de demanar el permís del sistema pot aparèixer una breu explicació a l’app.

## Problemes coneguts

- En **navegador / PWA**, la pantalla Premium pot indicar que la compra és només a l’app Android (és esperat).  
- Sense connexió, part del funcionament és limitada (sincronització diferida segons disseny).

## Contacte

Per dubtes tècnics durant la revisió, utilitza el **correu de contacte del desenvolupador** indicat a la fitxa de Play Console.
