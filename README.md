# Cristina & Antonio

Invitación digital premium para la boda de Cristina & Antonio, creada con Angular 22, TypeScript estricto, standalone components, Angular Router, SCSS y GSAP ScrollTrigger.

## Requisitos

- Node `24.15.0` o superior compatible con Angular 22.
- npm `11` o superior.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm start
```

La aplicación se sirve normalmente en `http://localhost:4200/`.

## Build

```bash
npm run build
```

## Datos principales

Los datos editables están centralizados en:

```text
src/app/core/wedding.config.ts
```

Ahí puedes cambiar:

- Nombres: `Cristina & Antonio`.
- Fecha visible: `4 de septiembre`.
- Hora visible: `Pendiente de confirmar · aprox. 19:30`.
- Lugar: `Recreo San Luis`.
- Fecha real del countdown: `startsAt`.
- Enlace de Google Maps.
- Enlace de Google Calendar.

La fecha provisional configurada para el countdown es `2027-09-04T19:30:00+02:00`, pensada para Europe/Madrid.

## Textos y secciones

La home está dividida por componentes en:

```text
src/app/features/wedding-home/components/
```

Cada sección tiene su propio `.ts`, `.html` y `.scss` para que los textos sean fáciles de localizar y cambiar.

## Imágenes

La foto de la pedida se carga desde `public/images/` con el nombre base `pedida-paris`. La web prueba estas rutas automáticamente:

- `public/images/pedida-paris.webp`
- `public/images/pedida-paris.png`
- `public/images/pedida-paris.jpg`
- `public/images/pedida-paris.jpeg`

## RSVP

El formulario de confirmación usa Reactive Forms y validaciones básicas. El servicio está en:

```text
src/app/core/services/rsvp.service.ts
```

Ahora mismo `submitRsvp` simula el envío y devuelve éxito con RxJS. Para conectarlo con Firebase o Supabase, sustituye el contenido de ese método por una llamada al SDK o a una API propia, manteniendo el contrato `RsvpSubmission`.

## Buzón privado de Telegram

La sección **Buzón de los novios** permite enviar un mensaje con nombre opcional. No usa una base de datos: la función de Cloudflare Pages situada en `functions/api/guest-message.js` valida el formulario y reenvía el contenido directamente a un grupo privado de Telegram.

Configura estas variables cifradas en **Cloudflare Pages → Settings → Variables and Secrets** para los entornos de producción y preview:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

- `TELEGRAM_BOT_TOKEN` es el token privado entregado por `@BotFather`. Nunca debe añadirse al repositorio.
- `TELEGRAM_CHAT_ID` es el identificador del grupo privado al que se enviarán los mensajes.

Después de añadir o modificar los secretos, vuelve a desplegar el proyecto. El endpoint público utilizado por Angular es `POST /api/guest-message`.

## Animaciones

Las animaciones principales con GSAP ScrollTrigger están en:

```text
src/app/features/wedding-home/wedding-home.component.ts
```

Incluyen fade/scale del hero, entradas de títulos, reveal de fotos, crecimiento del timeline, aparición destacada de la tarjeta del evento y entrada del RSVP. Si el usuario tiene `prefers-reduced-motion: reduce`, las animaciones se simplifican o se desactivan.

## Decisiones técnicas

- Angular 22.0.5 es la versión estable consultada en npm al crear el proyecto.
- Angular CLI 22 exige Node `22.22.3`, `24.15.0` o superior; por eso el proyecto se generó y validó con Node `24.15.0`.
- Se evita Angular Material para mantener una estética propia y reducir peso.
- La arquitectura separa `core`, `shared` y `features` para facilitar el mantenimiento.
- GSAP se limita a la narrativa de scroll; animaciones simples usan CSS o IntersectionObserver.

## Álbum privado de fotografías

La ruta pública `/fotos` permite seleccionar hasta 3 imágenes por tanda, sin límite acumulado por navegador. Optimiza en cliente las imágenes compatibles (máximo 2560 px, JPEG al 88 %) y conserva el original cuando el navegador no puede decodificarlo, como puede ocurrir con HEIC. El servidor vuelve a comprobar todos los límites; el frontend no se considera una barrera de seguridad.

La ruta `/admin-fotos` muestra el uso, las últimas fotografías, permite eliminarlas y abrir o cerrar las subidas. R2 es privado: las imágenes se sirven únicamente desde `/api/admin/photo` después de validar Cloudflare Access.

### Arquitectura y garantías

- `worker/photo-api.js`: Worker dedicado que sirve configuración, subida y administración bajo `/api/photos/*` y `/api/admin/*`.
- `functions/api/photos/*` y `functions/api/admin/[[path]].js`: handlers compartidos por el Worker y el desarrollo local.
- `migrations/0001_photo_uploads.sql`: metadatos, contadores, reservas, idempotencia y rate limit.
- R2 (`WEDDING_PHOTOS`): binarios privados con nombres aleatorios generados en servidor.
- D1 (`WEDDING_DB`): metadatos y contadores; nunca se recorre R2 para calcular el uso.
- La API vive en un Worker separado porque el backend de despliegue de Pages rechazaba la generación del binding D1; las rutas públicas permanecen en el mismo dominio y Angular continúa en Pages.
- El límite económico está fijado exactamente a 8 GB (8.000.000.000 bytes) tanto en configuración como en código. Los triggers de D1 reservan bytes y cuota por dispositivo dentro de un `batch` transaccional antes de escribir en R2, evitando carreras entre subidas concurrentes.
- El identificador persistente del navegador se transforma con SHA-256 y un salt secreto antes de guardarlo. Se utiliza para el rate limiting, no para limitar el número total de fotos. La IP solo participa como límite secundario y nunca como identidad única.
- Se inspeccionan las firmas binarias de JPEG, PNG, WebP y HEIC/HEIF; cambiar una extensión no permite subir otro tipo de archivo.

### Crear recursos en Cloudflare (una sola vez)

No ejecutes el despliegue hasta sustituir todos los `REPLACE_WITH_...` de `wrangler.jsonc` y revisar que el nombre del proyecto Pages coincide con el existente. Al incorporar un archivo Wrangler, este pasa a ser la fuente de verdad de la configuración de Pages. Conserva también cualquier ajuste actual del dashboard; los secretos de Telegram siguen siendo necesarios.

```bash
npx wrangler login
npx wrangler d1 create boda-fotos
npx wrangler r2 bucket create boda-fotos-private
npx wrangler r2 bucket create boda-fotos-private-preview
```

Copia el `database_id` devuelto por el primer comando en `wrangler.jsonc`. En **Turnstile → Add widget**, crea un widget para `cristinayantonio.com.es`, copia su site key en `TURNSTILE_SITE_KEY` y guarda la clave secreta con:

```bash
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name boda
openssl rand -hex 32
npx wrangler pages secret put DEVICE_HASH_SALT --project-name boda
```

El valor producido por `openssl` es el que debes pegar cuando el segundo comando lo solicite. No se guarda en el repositorio. Aplica después la migración remota:

```bash
npx wrangler d1 migrations apply boda-fotos --remote
```

### Proteger la administración con Cloudflare Access

En **Cloudflare Zero Trust → Access controls → Applications**, crea una aplicación **Self-hosted** y añade a la misma aplicación estos dos destinos públicos:

```text
cristinayantonio.com.es/admin-fotos*
cristinayantonio.com.es/api/admin/*
```

Añade una política `Allow` limitada a los correos de los novios. Copia el dominio del equipo y el **Application Audience (AUD) Tag** en `CF_ACCESS_TEAM_DOMAIN` y `CF_ACCESS_AUD` de `wrangler.jsonc`. La Function no confía solo en que la URL esté oculta: valida firma RS256, issuer, audience y caducidad del JWT enviado por Access.

Protege también el dominio `*.pages.dev` del proyecto o desactiva su acceso público para que no exista una vía alternativa sin Access. `ADMIN_DEV_TOKEN` es exclusivamente una ayuda local y no debe configurarse nunca en preview ni producción.

### Probar todo en local

Crea `.dev.vars` (está ignorado por Git) con claves de prueba de Turnstile y valores locales:

```dotenv
TURNSTILE_SECRET_KEY=CLAVE_SECRETA_DE_PRUEBA_DE_TURNSTILE
DEVICE_HASH_SALT=un-valor-local-largo-y-aleatorio
ADMIN_DEV_TOKEN=un-token-solo-para-local
```

Para pruebas locales cambia temporalmente `TURNSTILE_SITE_KEY` por la site key de prueba oficial de Turnstile y `TURNSTILE_EXPECTED_HOSTNAME` por `localhost`. No confirmes esos cambios. Luego:

```bash
npm install
npm run build
npx wrangler d1 migrations apply boda-fotos --local
npx wrangler pages dev dist/boda-cristina-antonio/browser
```

Abre `http://localhost:8788/fotos`. Para `/admin-fotos`, introduce el mismo `ADMIN_DEV_TOKEN` cuando aparezca el formulario local. Los datos D1 y R2 que usa `wrangler pages dev` son locales.

Casos mínimos a comprobar antes de la boda: selección de más de 3, varias tandas consecutivas, archivo de más de 8 MB, vídeo renombrado a JPG, reintento sin conexión, cierre desde administración, borrado, iPhone/Safari con HEIC y Android/Chrome.

### Despliegue

Con Git integration, confirma los cambios y deja que el proyecto Pages existente construya con `npm run build`; el directorio de salida es `dist/boda-cristina-antonio/browser`. Como alternativa manual, después de revisar toda la configuración:

```bash
npm run build
npx wrangler pages deploy dist/boda-cristina-antonio/browser --project-name boda
```

Este repositorio no crea ni modifica recursos reales por sí solo. La migración remota, los secretos, Access y el despliegue requieren los comandos o pasos anteriores.
