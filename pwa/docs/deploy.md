# Despliegue por cliente (Modelo C)

Un solo repo contiene el core y la configuración de cada radio. Cada cliente se
construye y despliega de forma independiente en Dockploy; un cambio en el repo
puede llegar a todos reconstruyendo cada cliente.

## Estructura

```
clients/<nombre>/
├─ client.json          # { "clientId": "...", "name": "..." }  ← lo único que configuras por radio
└─ (opcional) overrides/   # desarrollos específicos de ese cliente
```

El `clientId` se obtiene desde el panel de IPStream en `/dashboard/api-test`.

## Elegir el template de cada radio

El template **se elige desde el panel** (campo `selectedTemplate`), no en el
código. Cada build de cliente consulta ese campo y renderiza el diseño
correspondiente. Al cambiar el template en el panel y recargar la app, el diseño
cambia **sin redesplegar**.

Templates disponibles en esta app: `minimalista`, `moderna`, `blue`, `moderno`,
`tradicional`, `app`, `petroleo`, `petroleoblue`, `playlist`, `covered`. Cualquier id no
registrado usa `minimalista` por defecto (sin romper).

## Iconos y favicon por cliente

> Detalle completo y operativa en [`docs/iconos-por-cliente.md`](./iconos-por-cliente.md).

Cada radio puede tener su propio favicon e iconos de instalación de la PWA.
Colócalos en `clients/<nombre>/icons/` con estos nombres exactos:

- `favicon.png`
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)
- `icon-maskable-512.png` (512x512, con el logo dentro del 80% central)
- `apple-touch-icon.png` (180x180)

Reglas:

- El build fusiona `public/` con `clients/<nombre>/icons/`: los archivos del
  cliente sobrescriben a los compartidos y lo que no definas se hereda (p. ej.
  `offline.html`). Puedes personalizar solo el favicon o solo algunos tamaños.
- `favicon.png` es el favicon de la pestaña (recomendado 32x32 o 48x48; el
  navegador lo escala). No se usa SVG: el favicon es siempre PNG.
- Los nombres deben ser exactos: el manifest de la PWA referencia esos archivos.
- `npm run new-client` copia los iconos compartidos a `clients/<nombre>/icons/`
  como punto de partida; reemplázalos por los de la radio.
- Si la radio no tiene carpeta `icons/`, se usan los iconos compartidos de
  `public/` sin fallar.

## Metadatos al compartir (Open Graph / Twitter)

> Detalle completo y operativa en [`docs/compartir-enlaces.md`](./compartir-enlaces.md).

Al compartir el enlace de una radio en WhatsApp, Facebook o X, el preview usa
los metadatos inyectados en el HTML del build (los crawlers no ejecutan
JavaScript). `npm run build:client` consulta la API pública del cliente
(`/basic-data`) y arma automáticamente:

- `og:title` / `twitter:title`: `projectName` (o el `name` del `client.json`).
- `og:description` / `twitter:description`: `projectDescription`.
- `og:image` / `twitter:image`: la portada (`coverUrl`); si no hay, el logo
  (`logoUrl`); si tampoco, `{siteUrl}/icon-512.png`.
- `og:url`: el `siteUrl` del `client.json` o, si no, el `websiteUrl` del API.

Campos opcionales de `clients/<nombre>/client.json`:

```json
{
  "clientId": "cmXXXX",
  "name": "Radio Ejemplo",
  "siteUrl": "https://radioejemplo.cl"
}
```

Notas:

- Si la API no responde durante el build, el build continúa con el `name` del
  `client.json` y omite los campos que no pueda resolver.
- Los previews por noticia/artículo no cambian: todas las rutas comparten el
  mismo `index.html`, así que se muestra la identidad de la radio. El detalle
  por noticia requeriría SSR o prerender.

## Splash de carga

> Detalle en [`docs/splash-carga.md`](./splash-carga.md).

Mientras se cargan los datos del cliente se muestra un splash con su logo y
**no se monta el template** hasta conocer el `selectedTemplate`, evitando el
flash del template por defecto.

## Instalación de la app

> Detalle en [`docs/instalacion-pwa.md`](./instalacion-pwa.md).

Los templates muestran dos botones (`public/app-android.png` y
`public/app-apple.png`). El de Android dispara el prompt de instalación de la
PWA; el de Apple abre un modal con las indicaciones para agregar a la pantalla
de inicio. Se ocultan si la app ya está instalada.

## Agregar una nueva radio

1. Crear la configuración y validar el build en un solo paso:

```bash
npm run new-client -- radio-nueva cmXXXXXXXXXXXX "Nombre de la Radio"
```

   - `radio-nueva` → nombre de la carpeta (kebab-case).
   - `cmXXXXXXXXXXXX` → el `clientId` del panel (`/dashboard/api-test`).
   - `"Nombre de la Radio"` → opcional; el nombre visible.
   - El script crea `clients/radio-nueva/client.json` y ejecuta el build para confirmar que queda listo.

2. Si el build no falla, verás `✓ Cliente listo. Despliégalo en Dockploy con CLIENT=radio-nueva`.

3. Probar con preview (opcional):

```bash
npx vite preview --outDir dist/radio-nueva
```

## Desplegar en Dockploy

Para cada cliente, crea un proyecto que apunte a este repositorio y usa el
`Dockerfile` con el build arg del cliente:

- **Build args**: `CLIENT=radio-nueva` (coincide con `clients/<nombre>`).
- El `Dockerfile` ejecuta `npm run build:client -- ${CLIENT}` y sirve
  `dist/${CLIENT}` con nginx (SPA fallback incluido).

> En Dockploy/Easypanel los build args se configuran en la sección "Build" del
> proyecto (variable `BUILD_ARGS`). El puerto expuesto es `80`.

## Actualizar todos los clientes a la vez

1. Cambiar el código del core en el repo.
2. Reconstruir/redesplegar cada proyecto en Dockploy (o disparar el rebuild de
   cada cliente). Como todos usan el mismo repo, el mismo commit llega a todos.

## Desarrollos específicos por cliente

El core no se toca para personalizaciones: los cambios específicos viven en
`clients/<nombre>/` (p. ej. `overrides/`). Si un cliente requiere algo que el
core no soporta, se incorpora como extensión opt-in sin afectar al resto.

## Desarrollo local

```bash
cp .env.example .env   # clientId por defecto (solo dev)
npm run dev            # abre / con ese clientId
```

Para probar otro cliente no existe una ruta `/c/{clientId}`: el clientId se
resuelve únicamente desde `VITE_CLIENT_ID` (horneado en el build/dev). Opciones:

1. Editar `.env` con el cliente que quieras probar (variables `VITE_CLIENT_ID`
   y `VITE_CLIENT_NAME`) y ejecutar `npm run dev`.

2. Probar un cliente real (crea `clients/<nombre>/client.json`, valida el build
   y genera `dist/<nombre>`) y servirlo:

```bash
npm run new-client -- radio-nueva cmXXXXXXXXXXXX "Nombre de la Radio"
npx vite preview --outDir dist/radio-nueva
```
