# Metadatos al compartir enlaces (Open Graph / Twitter)

Cómo se genera el "preview" cuando alguien pega el link de una radio en WhatsApp,
Facebook, X, Telegram, etc., y qué hay que hacer cuando el cliente cambia sus
datos en el panel.

## Resumen importante

**El preview social se genera en el build, NO en runtime.** Un crawler de redes
sociales lee el HTML crudo de la URL y **no ejecuta JavaScript**. Por eso los
metadatos (`og:*`, `twitter:*`) se inyectan en `index.html` durante
`npm run build:client` y quedan **congelados** hasta reconstruir ese cliente.

```
Crawler (WhatsApp) ──GET https://radio.cl/──► nginx ──► index.html (meta estáticos)
                                                            ▲
build-client.mjs ──GET /api/public/{clientId}/basic-data───┘
```

## Qué se inyecta y de dónde sale

`scripts/build-client.mjs` consulta la API pública del cliente
(`GET /api/public/{clientId}/basic-data`) y arma, entre otros:

| Tag | Valor |
|-----|-------|
| `og:title` / `twitter:title` | `projectName` (o el `name` del `client.json`) |
| `og:description` / `twitter:description` | `projectDescription` |
| `og:image` / `twitter:image` | `coverUrl` → si no hay, `logoUrl` → si no, `{siteUrl}/icon-512.png` |
| `og:url` | `siteUrl` del `client.json` → si no, `websiteUrl` del API |
| `og:site_name` | `projectName` |
| `twitter:card` | `summary_large_image` si hay imagen, si no `summary` |
| `<title>` | `projectName` |

La inyección la hace el plugin `ipstream-og-meta` de `vite.config.ts`, usando
`src/core/seo/ogMeta.ts` (con escape HTML). En `index.html` el punto de
inyección es el comentario `<!-- og-meta -->`.

## ¿Qué se actualiza solo y qué no?

| Cambio en el panel | ¿Preview del link se actualiza solo? |
|---|---|
| Nombre, descripción, portada, logo | **No.** Requiere reconstruir y redesplegar ese cliente. |
| Contenido dentro de la app (noticias, programas, etc.) | Sí, en runtime (el navegador consulta la API). |
| Estado de streaming (tema, oyentes, live) | Sí, por polling. |

En otras palabras: la app puede mostrar el nombre nuevo, pero el preview de
WhatsApp seguirá mostrando el viejo hasta que reconstruyas.

## Cómo actualizar el preview tras un cambio en el panel

1. Reconstruir el cliente:

   ```bash
   npm run build:client -- <cliente>
   ```

2. Redesplegar en Dockploy (rebuild del proyecto de ese cliente).

## Campo `siteUrl` (opcional)

En `clients/<nombre>/client.json`:

```json
{
  "clientId": "cmXXXX",
  "name": "Radio Ejemplo",
  "siteUrl": "https://radioejemplo.cl"
}
```

Se usa para `og:url` y como base del fallback de imagen (`{siteUrl}/icon-512.png`).
Si no se define, se usa el `websiteUrl` del API; si tampoco existe, se omite
`og:url`.

## Degradación

Si la API no responde durante el build (red, timeout, error), el build **no
falla**: usa el `name` del `client.json` como título y omite los campos que no
pueda resolver. Los valores con caracteres especiales (`"`, `&`, `<`, `>`) se
escapan para no romper el HTML.

## Limitaciones conocidas

- **Preview por noticia/artículo**: compartir `/noticias/<slug>` muestra la
  identidad de la radio, no la de la noticia, porque todas las rutas comparten
  el mismo `index.html`. El detalle por noticia requeriría SSR o prerender.
- **Automático solo con rebuild/redespliegue**: para que un cambio del panel se
  refleje en el preview habría que hacer SSR/prerender o disparar el rebuild
  por un webhook (p. ej. de Dockploy).

## Automatización futura (referencia)

Si en algún momento se quiere que el preview se actualice solo tras cambios del
panel, las opciones son:

1. **SSR / prerender**: renderizar el HTML con datos frescos en el servidor.
2. **Rebuild automático**: un webhook de Dockploy que ejecute
   `build:client` del cliente cuando el panel cambie sus datos.

## Archivos involucrados

- `src/core/seo/ogMeta.ts` — lógica de metadatos y escape (+ tests `ogMeta.test.ts`).
- `vite.config.ts` — plugin `ipstream-og-meta` (`transformIndexHtml`).
- `scripts/build-client.mjs` — obtiene los datos del API y pasa `VITE_OG_JSON`.
- `index.html` — marcador `<!-- og-meta -->`.
- `clients/<nombre>/client.json` — `siteUrl` opcional.
