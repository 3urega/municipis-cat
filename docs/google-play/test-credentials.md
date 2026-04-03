# Credencials de prova per al revisor (Google Play)

## Important

- **No commiteu mai** contrasenyes reals en aquest repositori.
- Creeu **un sol usuari estable** al backend de producció (o l’entorn que indiqueu a la consola) i mantingueu les credencials només a:
  - secrets del desplegament (`PLAY_REVIEW_USER_PASSWORD`, etc.)
  - **Google Play Console** → la teva app → contingut de l’app → **Instruccions per a la verificació** (àrea restringida als revisors)

## Com crear l’usuari

1. Configura al servidor (secrets) variables d’entorn:
   - `PLAY_REVIEW_SEED_ENABLED=true` (només el temps del seed)
   - `PLAY_REVIEW_USER_EMAIL` — correu únic, p. ex. `play.review@elteudomini.cat`
   - `PLAY_REVIEW_USER_PASSWORD` — contrasenya forta
2. Executa **una vegada** (CI manual o shell segur):

   ```bash
   npm run db:seed:play-review
   ```

3. Torna a posar `PLAY_REVIEW_SEED_ENABLED=false` (o elimina la variable) per evitar execucions accidentals.

Vegeu també [`reviewer-instructions.md`](reviewer-instructions.md).

## Plantilla per enganxar a Play Console (sense desar al git)

Després del seed, omple això **només** a la consola de Google:

| Camp | Valor |
|------|--------|
| Email | *(el mateix que `PLAY_REVIEW_USER_EMAIL`)* |
| Password | *(el mateix que `PLAY_REVIEW_USER_PASSWORD`)* |

## Notes

- L’usuari creat té rol **`user`** (no administrador): el flux coincideix amb un usuari real.  
- Si canvieu la contrasenya al seed, actualitzeu també les instruccions a Play Console el mateix dia.  
- Assegureu que `AUTH_ALLOW_CREDENTIALS=true` (o política equivalent) estigui activa en el backend que farà servir el revisor.
