# Instalación de la app (botones Android / Apple)

Cómo se ofrece la instalación de la PWA en los templates.

## Qué se muestra

En lugar del antiguo botón de texto "Instalar app", los templates muestran dos
botones con las imágenes de plataforma:

- `public/app-android.png` → botón Android.
- `public/app-apple.png` → botón Apple.

Ambos se ocultan cuando la app ya está instalada (evento `appinstalled` o modo
`standalone`).

## Comportamiento

| Botón | Acción |
|-------|--------|
| Android | Dispara el prompt nativo de instalación (`beforeinstallprompt`). Si no está disponible, abre un modal con las indicaciones de Android. |
| Apple | Abre un modal con los pasos para "Añadir a pantalla de inicio" en iOS. |

El modal es accesible (`role="dialog"`, `aria-modal`) y se cierra con Escape,
con el botón de cerrar o tocando el fondo.

### Pasos que muestra el modal

- **iOS (Apple)**: abrir en Safari → botón Compartir → "Añadir a pantalla de
  inicio" → confirmar.
- **Android**: menú del navegador (⋮) → "Instalar aplicación" o "Añadir a
  pantalla de inicio" → confirmar.

## Assets

Las imágenes viven en `public/` (compartidas por todos los clientes). Un cliente
puede reemplazarlas poniendo `app-android.png` / `app-apple.png` en
`clients/<nombre>/icons/`, porque el build fusiona `public/` con esa carpeta
(ver [`docs/iconos-por-cliente.md`](./iconos-por-cliente.md)).

## Archivos involucrados

- `src/modules/pwa/InstallPrompt.tsx` — botones y lógica de instalación.
- `src/modules/pwa/InstallHelpModal.tsx` — modal de indicaciones.
- `src/modules/pwa/InstallPrompt.module.css` / `InstallHelpModal.module.css`.
- `public/app-android.png`, `public/app-apple.png`.

## Notas

- iOS no dispara `beforeinstallprompt`; por eso el botón Apple siempre muestra
  las instrucciones.
- El prompt nativo lo controla el navegador; si el usuario lo descarta, no se
  insiste.

## Detección de app instalada

Los botones se ocultan cuando se detecta que la app ya está instalada:

- Evento `appinstalled` (cuando se instala desde la página).
- iOS: `navigator.standalone`.
- `display-mode: standalone`, `fullscreen` o `minimal-ui`.
- Cambio a modo standalone en caliente (abre la app instalada): se ocultan sin
  recargar.

La detección es **por sesión**: no se guarda una marca permanente. Así, si el
usuario desinstala la PWA, los botones vuelven a aparecer en la próxima visita.
