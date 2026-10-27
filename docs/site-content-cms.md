# Sitio público (CMS)

El contenido editorial de casterfly.com se administra desde el panel en
`/admin/sitio`. El sitio sigue siendo la app Astro de `ipstreamweb2`; el panel
es la fuente de verdad del contenido.

## Qué se edita

- General: nombre, tagline, email, URL del panel y URL del stream de demo.
- Inicio, IA, Plataforma, Studio, Chat y Reproductores.
- Tarjetas de pilares, funcionalidades, IA, Studio, reproductores, FAQ y soporte.
- SEO por página.
- Contacto y redes sociales.

No se editan desde aquí: planes, noticias, tutoriales, portafolio ni mensajes de
contacto. Esos flujos siguen en sus secciones actuales.

## Cómo funciona

1. El panel guarda un documento JSON por idioma en la tabla `site_content`.
2. La API pública entrega el contenido publicado:
   `GET https://panel.casterfly.com/api/public/site-content?locale=es|en`.
3. El sitio lo consulta en runtime, lo mezcla con el contenido estático actual
   y aplica fallback si el panel no responde.
4. Los cambios se ven dentro de la ventana de caché (~60 s en el panel y ~60 s
   en el sitio).

La API pública es de solo lectura. La escritura requiere sesión `ADMIN` en
`/api/admin/site-content`.

## Idiomas

Hay un documento para `es` y otro para `en`. Si falta una clave en inglés, el
sitio usa la versión en español y, si tampoco existe, el texto estático.

## Imágenes

Los campos de imagen aceptan una ruta del sitio (`/images/...`) o una URL
absoluta. El botón **Subir imagen** usa el uploader del panel y guarda una URL
absoluta bajo `/api/uploads/admin/...`.

## Deploy

### Panel

El deploy normal de GitHub Actions aplica el schema con `prisma db push`; la
tabla `site_content` se crea sola. El seed inicial se ejecuta de forma
idempotente en la primera lectura/escritura de contenido: crea `es` y `en` con
el snapshot `prisma/seed/site-content.json` solo si no existen.

No hay que correr un seed manual.

### Sitio

El cambio de código del sitio (consumo de la API) requiere un deploy único:

```bash
# desde la raíz de ipstreamweb2
npm run typecheck && npm test && npm run build
```

En producción el sitio se sincroniza a `/opt/casterfly-site` y se reconstruye:

```bash
cd /opt/casterfly-site
docker compose -f docker-compose.panel.yml up -d --build
```

Después de ese deploy, editar contenido en `/admin/sitio` **no** requiere
redesplegar el sitio.

## Rollback

- Si el panel falla o devuelve contenido inválido, el sitio usa el contenido
  estático actual; no queda en blanco.
- Para revertir el sitio, volver a desplegar la versión anterior de
  `ipstreamweb2`.
- Las filas de `site_content` no afectan otros módulos y pueden dejarse; el
  editor puede ocultarse retirando la entrada del sidebar si hiciera falta.

## Verificación

```bash
# Panel
npx tsc --noEmit
npm test -- lib/site-content.test.ts lib/site-content-service.test.ts lib/site-content-save.test.ts lib/site-content-fields.test.ts
npm run build

# Sitio
npm run typecheck && npm test && npm run build
```

No toca el agente de streaming ni requiere "Actualizar nodo".
