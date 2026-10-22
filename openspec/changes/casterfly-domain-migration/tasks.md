# Tasks

## 1. DNS y TLS

- [x] 1.1 Crear en Cloudflare los registros `A` de `panel.casterfly.com`, `stream.casterfly.com`, `www.casterfly.com` y el wildcard `*.casterfly.com` hacia la IP del VPS; verificar con `dig +short` que los cuatro resuelven y que `casterfly.com` sigue resolviendo.
- [x] 1.2 Confirmar que los hosts de panel, stream y WebRTC/DB no quedan proxeados por Cloudflare cuando el puerto lo requiera; verificar que `8010/udp` y `3307/tcp` siguen accesibles desde un nodo de prueba.
- [x] 1.3 Verificar que el token de Cloudflare tiene permiso `Zone:DNS:Edit` sobre `casterfly.com`; ejecutar la validación de DNS del panel y confirmar que no devuelve error de zona.

## 2. Caddy y dominios separados

- [x] 2.1 Reemplazar en `deploy/Caddyfile` el uso de `{$STREAM_DOMAIN}` como dominio del panel por bloques explícitos `{$PUBLIC_DOMAIN}`, `{$PANEL_DOMAIN}` y `{$STREAM_DOMAIN}`; verificar con `docker exec ipstream-caddy caddy validate --config /etc/caddy/Caddyfile`.
- [x] 2.2 Agregar el bloque de `www.casterfly.com` con redirección permanente al root; verificar con `curl -I https://www.casterfly.com/planes`.
- [x] 2.3 Actualizar `deploy/.env.prod.example`, `deploy/scripts/deploy.sh` y `deploy/scripts/cron-push.sh` con las tres variables y sus valores CasterFly; verificar que `deploy.sh` falla con un mensaje claro si falta alguna y que el `BASE_URL` de cron usa `panel.casterfly.com`.
- [ ] 2.4 Agregar el bloque del sitio público `casterfly.com` apuntando al contenedor `site:80` y verificar que responde `200` con `curl --resolve casterfly.com:443:<IP> https://casterfly.com/`.
- [x] 2.5 Verificar que `casterfly.com` deja de caer en el catch-all de tenants y que el certificado TLS se emite; comprobar con `curl -Iv https://casterfly.com` que no hay error de TLS.

## 3. Panel: entorno y Server Actions

- [x] 3.1 Actualizar `deploy/docker-compose.prod.yml` y `.env.example` con `NEXTAUTH_URL`, `PANEL_PUBLIC_URL`, `PANEL_PUBLIC_HOST`, `ICE_PUBLIC_URL`, `HARBOR_PUBLIC_HOSTNAME`, `CORS_ALLOWED_ORIGINS` y `CLIENT_SITES_*` de CasterFly; verificar que `docker compose config` resuelve las variables sin valores viejos.
- [x] 3.2 Actualizar `next.config.js` para aceptar `panel.casterfly.com` y `panelipstream.cl` en `serverActions.allowedOrigins` sin depender del build arg; verificar con `npm run build` y una prueba de guardado de formulario en el panel nuevo.
- [x] 3.3 Revisar `middleware.ts` y confirmar que el sitio público no pasa por el panel; verificar que `https://casterfly.com/dashboard` no llega al dashboard y que `https://panel.casterfly.com/dashboard` sí.
- [x] 3.4 Actualizar los fallbacks de URL absoluta y marca en `lib/email-hooks.ts`, `lib/signup.ts`, `app/api/admin/emails/send/route.ts`, `lib/streaming-helpers.ts` y `lib/account-pdf.ts`; verificar con `grep -R "panelipstream.cl" app lib components next.config.js` que solo queden referencias legacy intencionales.
- [x] 3.5 Documentar las nuevas variables y el mapa de hosts en `DEPLOY.md` y `.env.example`; verificar que un lector puede configurar el panel nuevo sin mirar el código.

## 4. Compatibilidad legacy

- [x] 4.1 Configurar `panelipstream.cl` para redirigir páginas con `308` a `panel.casterfly.com` preservando ruta y query; verificar con `curl -I https://panelipstream.cl/planes/plan-radio-pro` que el `Location` es correcto.
- [x] 4.2 Mantener `/api/*` de `panelipstream.cl` proxeado al panel sin redirección; verificar un `GET` y un `POST` con `curl -X POST` y confirmar que el método llega al panel.
- [x] 4.3 Mantener `stream.panelipstream.cl` proxeado a Icecast; verificar que una URL de mount antigua sigue devolviendo audio o los headers de Icecast.
- [x] 4.4 Verificar que `*.ipstream.cl` sigue sirviendo los sitios de clientes actuales y que no fueron capturados por el nuevo bloque público; probar un host existente con `curl -I`.

## 5. Migración de datos de dominios

- [x] 5.1 Crear un script idempotente que actualice `app_config.clientSitesDomain` a `casterfly.com` y `clientSitesTarget` a `clientes.casterfly.com`; verificar que una segunda ejecución no cambia nada.
- [x] 5.2 Implementar en el script la migración de `client_domains` de tipo `subdomain`: nueva fila `label.casterfly.com` activa y primaria, fila vieja `label.ipstream.cl` activa como alias; verificar con una fila de prueba que el resultado es el esperado y que no se duplica al repetir.
- [x] 5.3 Actualizar `BasicData.websiteUrl` solo cuando apunte al host viejo migrado; verificar que un dominio custom no se modifica.
- [x] 5.4 Actualizar `streaming_servers.publicHostname` y `publicUrl` del servidor principal a `stream.casterfly.com`; verificar que `getClientStreamUrls` devuelve la URL nueva.
- [x] 5.5 Ejecutar el script en dry-run y luego real; verificar con `curl 'https://panel.casterfly.com/api/public/resolve-domain?host=label.casterfly.com'` y con el host viejo que ambos devuelven el mismo `clientId`.
- [x] 5.6 Agregar `casterfly` a los slugs reservados en `lib/domain-slug.ts` y verificar con un test que `casterfly.casterfly.com` no se asigna a un cliente.

## 6. PWA

- [x] 6.1 Actualizar `pwa/src/core/config/tenant.ts` para que el default de desarrollo sea `https://panel.casterfly.com` y el bundle de producción use `VITE_API_BASE=''`; verificar con los tests de `tenant.test.ts`.
- [x] 6.2 Actualizar `pwa/src/sw.ts` para cachear la API solo cuando el origen coincida con `self.location.origin` o con el origen configurado; verificar con un test que `panelipstream.cl` ya no se cachea.
- [x] 6.3 Actualizar `.github/workflows/deploy-site-bundle.yml` o el script de build para inyectar el origen de API de producción; verificar que el workflow publica el bundle y que un sitio de cliente hace `resolve-domain` contra el panel nuevo.
- [x] 6.4 Verificar en un navegador que `radio-x.casterfly.com` resuelve el tenant, carga noticias y reproduce audio sin llamadas a `panelipstream.cl` en la pestaña Network.

## 7. Identidad CasterFly

- [x] 7.1 Copiar `logo2.svg` y `fav.svg` a los assets del panel y generar los PNG necesarios (favicon, apple-touch, 192/512, OG); verificar que los archivos existen y que `PanelLogo` los carga en tema claro y oscuro.
- [x] 7.2 Reemplazar el logo por defecto del panel y del login, y actualizar `app/layout.tsx` para título, descripción y favicon de CasterFly; verificar visualmente login, dashboard y pestaña del navegador.
- [x] 7.3 Actualizar `components/admin/SupportInfo.tsx`, `components/admin/ClientSitesSettings.tsx`, `app/registro/page.tsx`, `app/planes/[slug]/page.tsx`, `app/dashboard/television/connection/page.tsx` y los textos de soporte con dominio/marca CasterFly; verificar con `grep -R "ipstream"` que no queden textos de usuario.
- [ ] 7.4 Actualizar plantillas de correo y PDF (`scripts/seed-email-templates.js`, `lib/pdf-styles.ts`, `lib/account-pdf.ts`) con logo y contacto CasterFly; verificar un correo de prueba y un PDF generado.
- [x] 7.5 Actualizar los assets por defecto de la PWA y el nombre por defecto a CasterFly sin tocar los tokens de marca; verificar el manifest y el splash de un sitio sin branding propio.

## 8. Servicios externos

- [ ] 8.1 Verificar `casterfly.com` en Resend y actualizar `RESEND_FROM_EMAIL` a `no-reply@casterfly.com`; enviar un correo de prueba y confirmar entrega.
- [ ] 8.2 Actualizar el webhook y la return URL de PayPal a `panel.casterfly.com`; probar una orden sandbox y confirmar que el pago vuelve al panel nuevo.
- [ ] 8.3 Actualizar la URL del webhook de OneSignal por cliente a `panel.casterfly.com/api/webhook/onesignal`; verificar que un clic de notificación se registra.
- [x] 8.4 Verificar que el token de Cloudflare usado por el panel pertenece a la zona `casterfly.com` y que la creación de un subdominio de prueba funciona; borrar el registro de prueba.

## 9. Nodos remotos

- [ ] 9.1 Configurar `CORS_ALLOWED_ORIGINS` con `https://panel.casterfly.com` y `https://panelipstream.cl`, y `PANEL_PUBLIC_HOST=panel.casterfly.com`; verificar que un nodo recién provisionado recibe ambos valores en su `.env`.
- [ ] 9.2 Pulsar **"Actualizar nodo"** en cada nodo remoto o editar su `.env` y reiniciar el agente; verificar que `DB_HOST`/`MYSQL_HOST` apuntan al panel nuevo y que el nodo sigue healthy.
- [ ] 9.3 Abrir la consola en vivo desde `panel.casterfly.com` contra un cliente en nodo remoto; verificar que el navegador no bloquea por CORS y que el audio llega.

## 10. Integración y verificación final

- [ ] 10.1 Verificar el flujo público completo: `casterfly.com` → planes → `panel.casterfly.com/planes/<slug>` → registro → login → dashboard; confirmar que no hay enlaces a `panelipstream.cl`.
- [ ] 10.2 Verificar el sitio público: home, planes, características, tutoriales, noticias, clientes, contacto y canonical en `https://casterfly.com`.
- [x] 10.3 Verificar los redirects legacy: página del panel viejo, API vieja con POST, stream viejo y un sitio `*.ipstream.cl`; confirmar que ninguno rompe.
- [x] 10.4 Ejecutar `npm test`, `npm run build` y `openspec validate casterfly-domain-migration --strict`; corregir cualquier fallo antes de cerrar.
- [x] 10.5 Documentar en `AGENTS.md`/`DEPLOY.md` el nuevo mapa de hosts, la obligación de actualizar nodos y el estado de los dominios legacy; verificar que un operador puede seguir el runbook sin ambigüedad.
