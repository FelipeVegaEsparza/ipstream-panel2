# Tasks

## 1. Slug y reservados

- [x] 1.1 Crear `lib/domain-slug.ts` con `slugifyRadioName`, `RESERVED_SUBDOMAINS`, `isReservedSlug`, `buildSiteHost`; verificar con casos (acentos/ñ, espacios, símbolos, vacío, reservado).

## 2. Disponibilidad

- [x] 2.1 Crear `GET /api/public/check-subdomain?name=` que devuelve `{ ok, slug, available, reason }` (invalid|reserved|taken|null) sin crear nada; verificar disponible/ocupado/reservado/inválido.

## 3. Registro

- [x] 3.1 Agregar `radioName` (obligatorio) a `registerSchema` en `lib/validations.ts`; verificar el mensaje de error cuando falta.
- [x] 3.2 En `/api/auth/register`, dentro de la transacción crear el `ClientDomain` (subdomain/active/primary) con el slug derivado y rechazar si es inválido/reservado/tomado; verificar registro exitoso y rechazo por nombre tomado (sin crear cuenta).
- [x] 3.3 Hacer upsert de `BasicData.projectName = radioName`; verificar que el cliente nuevo queda con ese `projectName`.
- [x] 3.4 Disparar `startDomainProvisioning` best-effort post-commit y devolver `siteUrl` en la respuesta; verificar que no rompe el registro si falla.

## 4. Formulario

- [x] 4.1 Agregar el campo obligatorio "Nombre de la radio" con preview `https://<slug>.ipstream.cl` y chequeo de disponibilidad (debounce) en `SignupForm`; verificar que no deja enviar vacío ni con nombre ocupado.
- [x] 4.2 Enviar `radioName` en el POST y mostrar el sitio creado en la pantalla de éxito; verificar con un registro de prueba.

## 5. Email de bienvenida

- [x] 5.1 Agregar la variable `sitio` a `sendWelcomeEmail` y el placeholder `{{sitio}}` a la plantilla `bienvenida` (seed); verificar el render.
- [ ] 5.2 Actualizar la plantilla `bienvenida` de producción con `{{sitio}}` (admin/seed) y verificar un envío real.

## 6. Verificación end-to-end

- [ ] 6.1 Registro real con un nombre de radio → cuenta creada + subdominio `active` + sitio sirviendo el nombre + email con la URL; limpiar el cliente de prueba.
