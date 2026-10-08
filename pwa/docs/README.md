# Documentación — PWA de clientes

App PWA multi-tenant (React 19 + Vite 8) que consumen las radios/TV de
IPStream Panel. Es parte del repo del panel; ver el `AGENTS.md` de la raíz.

## Modelo actual: bundle único servido por dominio

- La PWA se construye **una sola vez** (`npm run build`) y la sirve el panel
  para todos los clientes. El tenant se resuelve **por dominio** (tabla
  `client_domains` del panel + `resolve-domain`) y el branding (Open Graph,
  manifest, iconos) lo genera el panel por host.
- El bundle se publica en el VPS con el workflow `deploy-site-bundle.yml`
  (`pwa/**` en `paths`), que sincroniza `pwa/dist/` a
  `/opt/ipstream-panel/data/client-site/`.
- En el panel: `npm run build:client-site` construye la PWA y publica el bundle
  en `CLIENT_SITE_DIR` (default `public/client-site`).

## Documentos

- `deploy.md` — modelo anterior (build por cliente) — **histórico**.
- `nuevocliente.md` — alta de cliente anterior — **histórico** (ahora se hace
  en el panel: dominios del sitio).
- `iconos-por-cliente.md` — iconos por cliente (histórico; ahora el panel los
  genera desde el logo del cliente).
- `compartir-enlaces.md`, `splash-carga.md`, `color-destacado.md`,
  `clima.md`, `instalacion-pwa.md` — comportamiento de la app.
- `instruccionesapi.md` — contrato de la API pública del panel.
