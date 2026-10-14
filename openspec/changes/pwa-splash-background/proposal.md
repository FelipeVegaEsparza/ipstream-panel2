# Proposal

## Why

El splash de carga de la PWA (el que se ve al abrir la app, antes de que cargue el contenido) usa hoy un fondo sólido fijo. Muchos clientes tienen una imagen de marca pensada para ese momento y quieren usarla. No hay forma de configurarlo desde el panel.

## What Changes

- **Nuevo campo** `BasicData.splashBackgroundUrl` (opcional).
- **Datos básicos**: una sección para **subir la imagen de fondo del splash** (con recomendación de tamaño/relación de aspecto), usando el `ImageUpload` existente.
- **Procesamiento de la imagen**: al subirla, se **reencodea a WebP** y se **redimensiona a un lienzo vertical** (720×1280, recorte centrado `cover`) para que se vea bien y pese poco, sin edición manual.
- **API pública**: se expone `splashBackgroundUrl` en el bloque `basicData`.
- **Splash de la PWA**: el shell del tenant inyecta la imagen como fondo (cubriendo la pantalla) tanto en el splash **estático** del HTML como en el **loader de React** (`LoadingScreen`), vía una variable CSS.
- **Sin imagen** → se mantiene el fondo actual (color del tema).

## Capabilities

### New Capabilities
- `pwa/splash`: fondo de pantalla de carga (splash) de la PWA configurable por cliente.

### Modified Capabilities
- (ninguna)

## Impact

- **Panel**: `prisma/schema.prisma` (`BasicData.splashBackgroundUrl`), `lib/validations.ts`, `components/dashboard/BasicDataForm.tsx`, `app/api/upload/route.ts` (preset de splash), `components/ui/ImageUpload.tsx` (endpoint/preset), `lib/public-basic-data.ts`, `app/api/public/[clientId]/route.ts`, `lib/client-site.ts` (inyección del estilo en el shell).
- **PWA (`pwa/`)**: `index.html` (CSS del splash) y `src/app/LoadingScreen.module.css` (+ `LoadingScreen.tsx` si hace falta) para leer la variable CSS del fondo.
- **DB**: cambio aditivo `BasicData.splashBackgroundUrl String?`.
- **No-goals**: animaciones/bloques de texto en el splash, video, splash por plantilla, y edición manual de la imagen en el panel (el reencuadre vertical es automático).
