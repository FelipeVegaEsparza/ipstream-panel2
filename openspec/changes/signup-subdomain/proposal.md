# Proposal

## Why

Hoy, al contratar un plan desde la web pública (`/planes/<slug>`), el cliente crea su cuenta pero **no queda con un sitio**: hay que registrar su dominio a mano desde el admin. Queremos que en el mismo formulario diga el **nombre de la radio**, que ese nombre se convierta en su **subdominio** (`<nombre>.ipstream.cl`) y que se cree automáticamente, para que termine el registro con su sitio ya funcionando. El dominio propio queda, como hoy, para que el admin lo agregue después.

## What Changes

- **Formulario de registro** (`SignupForm`): campo **"Nombre de la radio"** (obligatorio), con vista previa en vivo del subdominio (`https://<slug>.ipstream.cl`) y chequeo de disponibilidad.
- **Endpoint de disponibilidad** `GET /api/public/check-subdomain?name=`: devuelve el slug normalizado y si está disponible / ocupado / reservado.
- **Registro** (`/api/auth/register`): deriva el slug del nombre, valida (formato + no reservado + único) y crea el `ClientDomain` del cliente (`kind: subdomain`, `status: active`, `isPrimary: true`) dentro de la transacción. También crea/actualiza `BasicData.projectName` con el nombre de la radio.
- **Email de bienvenida**: incluye la URL del sitio del cliente.
- **Nombres reservados**: lista (panel, stream, www, api, app, admin, clientes, mail, db, …) para no chocar con infra.

## Capabilities

### New Capabilities

- `client-sites/signup-subdomain`: captura del nombre de la radio en el registro público, derivación/validación del subdominio, creación automática del `ClientDomain` y su comunicación (email/siteUrl).

### Modified Capabilities

- Ninguna.

## Impact

- **UI**: `components/public/SignupForm.tsx` (campo + preview + check) y su módulo de estilos.
- **API**: `app/api/auth/register/route.ts` (+ `lib/validations.ts` `registerSchema`), nuevo `app/api/public/check-subdomain/route.ts`.
- **Lógica**: nueva utilidad de slug + reservados (p. ej. `lib/domain-slug.ts`), reutiliza `getClientSitesConfig()` y `startDomainProvisioning()`.
- **Email**: `lib/email-hooks.ts` (`sendWelcomeEmail` con `sitio`) y plantilla `bienvenida` (seed + placeholder).
- **Prisma**: sin cambios de schema (usa `ClientDomain` y `BasicData` existentes).
