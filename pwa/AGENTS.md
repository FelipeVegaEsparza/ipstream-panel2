# AGENTS.md — PWA de clientes (`pwa/`)

Esta carpeta es la app PWA multi-tenant de clientes, ahora parte del repo del
panel (ver el `AGENTS.md` de la raíz). Tiene dependencias propias y aisladas
(sin npm workspaces).

## Modelo

- **Bundle único resuelto por dominio**: se construye una sola vez
  (`npm run build` → un único `dist/`) y lo sirve el panel. El tenant se
  resuelve por host (`resolve-domain` del panel); el branding (Open Graph,
  manifest, iconos) lo genera el panel por dominio.
- Los scripts `build-client.mjs` / `new-client.mjs` y la carpeta `clients/`
  quedan solo para **desarrollo y assets de marca**, no para producción.

## Git

- No commitees ni pushees desde acá: los cambios de `pwa/` se commitean desde la
  raíz del repo siguiendo su flujo.
