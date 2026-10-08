# Gestión de iconos por cliente

Cómo funciona el favicon y los iconos de instalación PWA por radio, y cómo
personalizarlos.

## Resumen

Cada radio es un **build independiente** (`npm run build:client -- <cliente>`).
Durante ese build se fusionan los assets compartidos de `public/` con los
iconos propios del cliente en `clients/<nombre>/icons/`. El resultado es que
cada build sirve su favicon y sus iconos de instalación, sin tocar código del
core ni duplicar archivos compartidos.

Se resuelve en **build time**, no en runtime: el manifest de la PWA y el
`<link rel="icon">` se sirven estáticos, así que un cambio de icono requiere
reconstruir y redesplegar ese cliente.

```
clients/
└─ <nombre>/
   └─ icons/                    (opcional)
      ├─ favicon.png            ┐
      ├─ icon-192.png           │  sobrescriben a los de public/
      ├─ icon-512.png           │
      ├─ icon-maskable-512.png  │
      └─ apple-touch-icon.png   ┘

public/                          (compartido / default)
├─ favicon.png
├─ icon-192.png
├─ icon-512.png
├─ icon-maskable-512.png
├─ apple-touch-icon.png
└─ offline.html                  (siempre compartido)

        │  build-client.mjs
        ▼
node_modules/.tmp/public-<cliente>/   (public/ + overlay del cliente)
        │  VITE_PUBLIC_DIR
        ▼
dist/<cliente>/                       (assets finales + manifest)
```

## Convención de archivos

En `clients/<nombre>/icons/`, con **nombres exactos**:

| Archivo | Tamaño | Uso |
|---------|--------|-----|
| `favicon.png` | 32x32 o 48x48 | Favicon de la pestaña |
| `icon-192.png` | 192x192 | Icono PWA (Android/instalación) |
| `icon-512.png` | 512x512 | Icono PWA (splash / tiendas) |
| `icon-maskable-512.png` | 512x512 | Icono maskable (logo dentro del 80% central) |
| `apple-touch-icon.png` | 180x180 | Icono en iOS |

Los nombres no se pueden cambiar: el manifest de la PWA y `index.html` los
referencian con esos nombres fijos.

## Cómo funciona el build

1. `scripts/build-client.mjs` copia `public/` a
   `node_modules/.tmp/public-<cliente>/`.
2. Si existe `clients/<nombre>/icons/`, copia su contenido **encima**
   (sobrescribe). Lo que el cliente no defina se hereda de `public/`.
3. Pasa ese directorio a Vite con `VITE_PUBLIC_DIR`.
4. `vite.config.ts` usa `publicDir: process.env.VITE_PUBLIC_DIR || 'public'`.
5. Vite copia ese `publicDir` a `dist/<cliente>/` y VitePWA genera el manifest
   con los nombres de archivo de siempre.
6. El temporal se elimina siempre (`try/finally`), incluso si el build falla.

### Herencia parcial

Puedes reemplazar solo algunos archivos. Por ejemplo, si el cliente solo aporta
`favicon.png`, el build usa ese favicon y hereda de `public/` los iconos PWA y
`offline.html`.

## Favicon: siempre PNG

El favicon es **PNG canónico** (`/favicon.png`, `type="image/png"` en
`index.html`); no se usa SVG. El motivo: si coexistieran `favicon.svg`
compartido y `favicon.png` del cliente, el navegador suele preferir el SVG y el
PNG del cliente quedaría ignorado; además el overlay no puede borrar el SVG
heredado. Con PNG como único favicon, el archivo del cliente siempre gana.

`public/favicon.png` (48x48) es el default, generado por
`scripts/make-icons.mjs`.

## Crear una radio nueva

`npm run new-client -- <nombre> <clientId> "Nombre"`:

1. Crea `clients/<nombre>/client.json`.
2. Crea `clients/<nombre>/icons/` **copiando los iconos compartidos** como
   punto de partida.
3. Dispara el build de validación.

Luego reemplaza los archivos por los de la radio. Si no los tocas, el resultado
es idéntico al comportamiento por defecto.

## Personalizar una radio existente

1. Crea `clients/<nombre>/icons/` (si no existe).
2. Copia dentro los 5 archivos con los nombres exactos (o solo los que quieras
   cambiar; el resto se hereda).
3. Reconstruye y redespliega:

   ```bash
   npm run build:client -- <cliente>
   ```

## Regenerar los iconos por defecto

`public/` se genera con Node puro (dibuja un triángulo "play" genérico):

```bash
node scripts/make-icons.mjs
```

Genera `favicon.png` (48), `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png` y `apple-touch-icon.png` (180) en `public/`.

## Verificación

- Con iconos propios:
  `dist/<cliente>/favicon.png` debe ser el del cliente (compáralo con
  `cmp`), mientras `offline.html` y los iconos no definidos siguen presentes.
- Sin iconos propios: el build usa los de `public/` sin fallar.
- El manifest generado (`dist/<cliente>/manifest.webmanifest`) referencia
  `icon-192.png`, `icon-512.png` e `icon-maskable-512.png`.

## Notas

- Los iconos son **build-time**: cambiar un icono no se refleja hasta
  reconstruir y redesplegar ese cliente.
- No agregues archivos con nombres distintos: no serán referenciados por el
  manifest ni por el HTML.

## Archivos involucrados

- `scripts/build-client.mjs` — fusiona `public/` + `clients/<nombre>/icons/` y pasa `VITE_PUBLIC_DIR`.
- `vite.config.ts` — `publicDir` configurable; `manifest.icons` e `includeAssets`.
- `scripts/new-client.mjs` — scaffold de `clients/<nombre>/icons/`.
- `scripts/make-icons.mjs` — genera los iconos compartidos de `public/`.
- `index.html` — `<link rel="icon" type="image/png" href="/favicon.png">`.
- `clients/<nombre>/icons/` — assets de marca del cliente.
