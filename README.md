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
- Hora visible: `19:30`.
- Lugar: `El Recreo San Luis`.
- Fecha real del countdown: `startsAt`.
- Enlace de Google Maps.
- Enlace de Google Calendar.

La fecha configurada para el countdown es `2027-09-04T19:30:00+02:00`, pensada para Europe/Madrid.

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
