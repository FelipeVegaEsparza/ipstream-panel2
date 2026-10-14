# Tasks

## 1. Backend / DB

- [x] 1.1 Agregar `splashBackgroundUrl String?` a `BasicData` en `prisma/schema.prisma`; verificar `npx prisma generate` y `npx tsc --noEmit`.
- [x] 1.2 Agregar `splashBackgroundUrl` a `basicDataSchema` (`lib/validations.ts`) y al bloque `basicData` público (`lib/public-basic-data.ts` + `app/api/public/[clientId]/route.ts`); verificar que el payload público lo incluya.
- [x] 1.3 Invalidar el caché de contenido público al cambiar el splash (mismo criterio que logo/cover) y verificar que el cambio se refleje.
- [x] 1.4 Agregar un preset `splash` a `app/api/upload/route.ts` que reencoée a WebP y redimensione a 720×1280 (`fit: cover`, centrado) solo para imágenes; verificar que devuelve una URL `.webp` y las dimensiones verticales.

## 2. UI del dashboard

- [x] 2.1 Agregar a `components/ui/ImageUpload.tsx` un prop opcional `preset` (o `uploadUrl`) que se envíe al endpoint de subida; verificar que las demás imágenes sigan subiendo igual.
- [x] 2.2 Agregar en `components/dashboard/BasicDataForm.tsx` una sección con `ImageUpload` (preset `splash`) para la imagen de fondo del splash, con recomendación de tamaño vertical; verificar que se guarde, se optimice y persista en Datos básicos.

## 3. Splash (shell del panel + PWA)

- [x] 3.1 En `lib/client-site.ts` (`renderShell`) inyectar un `<style>` con `:root { --splash-bg-image: url('...') }` cuando el cliente tiene `splashBackgroundUrl`; verificar que el HTML servido lo incluya y no rompa el OG.
- [x] 3.2 En la PWA, hacer que `pwa/index.html` (`.app-splash`) y `pwa/src/app/LoadingScreen.module.css` (`.screen`) usen `background-image: var(--splash-bg-image, none)` con `cover`/`center` y fondo de color como fallback; verificar `cd pwa && npm run build` y `npm test`.
- [x] 3.3 Aplicar un desenfoque suave al fondo del splash (pseudo-elemento `::before` con `filter: blur`, en `index.html` y `LoadingScreen.module.css`) con una capa de contraste, dejando el logo nítido; verificar en el build.
- [x] 3.4 Subir la duración mínima del splash a ~6 s (`SPLASH_MIN_MS = 6000` en `pwa/src/app/App.tsx`); verificar que el loader se mantenga ese tiempo aunque el contenido cargue antes.

## 4. Verificación end-to-end

- [ ] 4.1 Con un cliente real: subir una imagen de splash (confirmar que queda `.webp` vertical); abrir su dominio y confirmar que el splash (estático y loader) muestra la imagen cubriendo la pantalla; quitarla y confirmar que vuelve el fondo por defecto.
