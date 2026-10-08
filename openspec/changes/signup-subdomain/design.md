# Design

## Context

Ver `proposal.md - Why`. Piezas existentes que se reutilizan:

- `ClientDomain` con `hostname` único (migración `tenant-runtime-pwa`), y `getClientSitesConfig()` para el dominio base (`ipstream.cl`) — fallback env.
- El registro público (`app/api/auth/register/route.ts`) crea usuario + cliente + streams + suscripción en una **transacción**; los correos y el seed del AutoDJ corren **fuera** (best-effort).
- El email de bienvenida usa plantillas en DB (`email_templates`), renderizadas con `vars` (`lib/email-hooks.ts`).
- El wildcard `*.ipstream.cl` ya está desplegado: crear un subdominio no requiere DNS, sólo la fila.

## Goals / Non-Goals

**Goals:**
- Capturar el nombre de la radio (obligatorio) con preview y chequeo de disponibilidad.
- Crear el `ClientDomain` automáticamente y dejarlo `active`/primario.
- Guardar el nombre como `projectName` y mostrarlo en el email de bienvenida.

**Non-Goals:**
- No se cambia el flujo de pago/prueba.
- No se permite elegir dominio propio en el registro (sigue siendo tarea del admin).
- No se detectan (ni resuelven) registros DNS preexistentes con el mismo nombre.

## Decisions

### 1. Utilidad de slug + reservados (`lib/domain-slug.ts`)
`slugifyRadioName(name)`: normaliza (NFD), quita diacríticos, minúsculas, `[^a-z0-9]+` → `-`, colapsa/recorta guiones, limita a 40 chars. Lista `RESERVED_SUBDOMAINS` (panel, stream, www, api, app, admin, clientes, mail, db, ftp, webmail, cpanel, autodiscover, autoconfig, panel1..3, dashboard, soporte, …). Funciones `isReservedSlug`, `buildSiteHost(slug)`.

- **Por qué**: una sola fuente de verdad para el slug, usada por el endpoint, el registro y la UI.

### 2. Endpoint público `GET /api/public/check-subdomain?name=`
Devuelve `{ ok, slug, available, reason }` con `reason: invalid|reserved|taken|null`. No crea nada. Usa `getClientSitesConfig().domain` para el hostname.

- **Alternativa**: chequear sólo en el submit. Se descarta: peor UX y más errores en el registro.

### 3. Creación atómica en la transacción del registro
En `register`, dentro de la transacción existente (tras crear el cliente), derivar el slug, validar (invalid/reserved) y crear el `ClientDomain` con `hostname = slug + '.' + domain`, `kind: subdomain`, `status: active`, `isPrimary: true`. El `@unique` de `hostname` cubre la carrera; su violación se mapea a "nombre no disponible".

- **Por qué `active`**: el wildcard ya cubre el subdominio; no hace falta provisión DNS. Igual se dispara `startDomainProvisioning` best-effort post-commit (idempotente, útil si no hubiera wildcard).
- Si el dominio base no está configurado, se omite la creación del dominio (el registro no falla).

### 4. `projectName` en `BasicData`
Se hace upsert de `BasicData` con `projectName = radioName` y `projectDescription = ''` si no existe. Así el shell y el email muestran el nombre al instante.

### 5. Email de bienvenida
Se agrega la variable `sitio` a `sendWelcomeEmail` y a la plantilla `bienvenida` (`<a href="{{sitio}}">`). El seed (`scripts/seed-email-templates.js`) se actualiza; la plantilla de producción se actualiza por el admin/seed (no se pisan plantillas existentes automáticamente).

### 6. UI en `SignupForm`
Input "Nombre de la radio" (sólo donde se crea cuenta; en el plan fijo y en `/registro`). Preview `https://<slug>.ipstream.cl` + estado (disponible/ocupado/reservado) con debounce contra el endpoint. Se envía `radioName` en el POST.

## Risks / Trade-offs

- **Squatting / abuso** → rate-limit existente (5/h/IP) + reservados + el admin puede editar/borrar dominios. (Endurecer con verificación de email queda a futuro.)
- **Nombre con registro DNS explícito previo** (p. ej. `fundacion`) → la fila se crea pero el registro explícito pisa al wildcard. No se detecta en el registro; el admin lo reconcilia.
- **Plantillas de email** → si la plantilla de prod no tiene `{{sitio}}`, la URL no aparece hasta actualizarla (seed/admin).
- **Slug muy corto/colisión** → validación de longitud mínima + `@unique`.

## Migration Plan

1. Deploy del panel (no hay cambios de schema).
2. Actualizar la plantilla `bienvenida` de producción para incluir `{{sitio}}` (desde el admin o re-seed controlado).
3. Rollback: quitar el campo del form / revertir el código; los subdominios ya creados quedan (borrables desde el admin).
