# Splash de carga con el logo del cliente

Cómo se evita el flash al abrir la URL de una radio y qué muestra el splash.

## Qué problema resuelve

Sin esto, al abrir la app se veía:

1. Un instante en blanco antes de que cargara JavaScript.
2. El template por defecto (`minimalista`) y luego el template seleccionado en
   el panel, porque `selectedTemplate` todavía no había llegado.

## Cómo opera (dos capas)

```
1) Splash estático (index.html, antes de JS)
   - plugin ipstream-splash inyecta `<!-- app-splash -->`
   - logo local + nombre + spinner
   - React lo reemplaza al montar

2) Loader en React (mientras carga la API)
   - App muestra LoadingScreen mientras `isLoading && !data`
   - recién con datos se monta el template seleccionado
```

Ambas capas comparten el mismo look, así que la transición es imperceptible.

## Tiempo mínimo

El splash se muestra al menos **1200 ms** (`SPLASH_MIN_MS` en `src/app/App.tsx`)
aunque los datos lleguen antes, para que se alcance a apreciar. Solo aplica a la
primera carga del tenant: en refetches con datos ya presentes no vuelve a
aparecer.

## Imagen usada

Se usa un **asset local**: `/icon-512.png`, que es el icono del cliente en
`clients/<nombre>/icons/` o, si no lo define, el compartido de `public/`.

¿Por qué local y no la portada del API? La portada (`coverUrl`) es una URL
remota que no alcanzaba a cargar antes de que desapareciera el splash, dejando
un fondo neutro. El icono local vive en el propio sitio y carga al instante
(además queda precacheado por el service worker).

## Qué se muestra

- Logo del cliente (320x320, redondeado; se limita a 80vw en pantallas
  pequeñas) sobre fondo `#1a1a2e`.
- Nombre del cliente (`VITE_CLIENT_NAME`, del `client.json`).
- Spinner animado.

## Preparación del reproductor

Mientras se muestra el splash, la app prefetchea el estado de streaming
(`/streaming`) del tenant. Así, al montar el template, la carátula del tema
actual ya está disponible y el hero no muestra primero el logo de la radio para
luego saltar a la carátula. Si el streaming tarda más que el splash, el artwork
cambia con un fundido cruzado (crossfade), no con un corte seco.

## Comportamiento del template

`TenantApp` no monta `<TemplateSlot>` hasta que hay datos; por eso no aparece el
template por defecto antes del seleccionado. Si la carga falla, se muestra la
pantalla de error (`ErrorScreen`), no el splash.

## Límites

- El splash del **sistema operativo** al abrir la PWA instalada (Android/iOS) es
  aparte: no lo controla el HTML. Android usa el manifest (íconos/colores) e iOS
  el `apple-touch-icon`.

## Archivos involucrados

- `src/core/seo/splash.ts` — `renderSplash`/`injectSplash` (+ tests `splash.test.ts`).
- `vite.config.ts` — plugin `ipstream-splash`.
- `index.html` — marcador `<!-- app-splash -->` y CSS inline.
- `src/app/LoadingScreen.tsx` — loader en React.
- `src/app/App.tsx` — gate del template mientras no hay datos.
- `clients/<nombre>/icons/icon-512.png` — logo mostrado (o el compartido).
