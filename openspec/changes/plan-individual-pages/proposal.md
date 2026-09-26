## Why

Hoy la única forma de contratar un plan es entrar a `/registro`, donde el cliente ve una lista de planes y debe elegir uno dentro del mismo formulario. No existe una página por plan, por lo que no se puede enlazar a un plan específico desde una landing/campaña ni mostrar sus características y su formulario de contratación en una página dedicada.

## What Changes

- **Nueva página pública por plan** `GET /planes/[slug]` (Server Component): muestra las características completas del plan y el formulario de contratación con ese plan ya preseleccionado. La página no cambia el endpoint de registro: el formulario sigue enviando a `POST /api/auth/register` con el `planId`.
- **Slug derivado del nombre**: cada plan se identifica por un slug generado a partir de `Plan.name` (minúsculas, sin acentos, espacios/símbolos → guiones). No se agrega campo ni migración Prisma; el slug se resuelve contra los planes activos.
- **Características del plan en la página**: nombre, descripción, precio/moneda/intervalo, servicios incluidos (Radio/TV/ambos), cuotas de almacenamiento, imagen y la lista completa de `features` (no limitada a 4–6 como en el selector). Incluye el chip de servicio y el badge "Más popular" con la misma lógica actual.
- **Formulario de contratación reutilizado**: se reutiliza el formulario de alta actual (nombre, email, contraseña) apuntando al plan de la página. Se adapta `SignupForm` para soportar un modo de un solo plan preseleccionado (sin lista seleccionable), preservando el flujo de éxito y de login existente.
- **SEO/metadata**: `generateMetadata` por plan (título y descripción basados en el plan).
- **Plan inexistente o inactivo → 404**: un slug que no corresponde a un plan activo responde `notFound()`.
- **Sin cambios en `/registro`**: la página actual y su flujo siguen funcionando igual; esta propuesta solo agrega el camino por plan.

## Capabilities

### New Capabilities

- `public-plan-pages`: páginas públicas individuales por plan (URL amigable por slug), que muestran las características del plan y su formulario de contratación con el plan preseleccionado.

### Modified Capabilities

- Ninguna.

## Impact

- **Rutas**: nueva ruta pública `app/planes/[slug]/page.tsx` (Server Component, `force-dynamic` como `/registro`).
- **Componentes**: `components/public/SignupForm.tsx` se extiende para soportar modo de plan único preseleccionado (prop opcional tipo `fixedPlan`/`allowPlanSelection`), sin romper el uso actual en `/registro`.
- **Libs**: helper nuevo (p. ej. `lib/plans.ts`) con la normalización `name → slug` y el parseo de `features`/metadata reutilizado por la página.
- **API**: sin cambios. Se reutiliza `POST /api/auth/register` (que ya acepta `planId`) y la lógica de `lib/signup.ts`.
- **Prisma**: sin cambios de esquema ni migraciones (slug derivado, no persistido).
- **Páginas**: `/registro` no se modifica.
- **Config**: sin variables de entorno nuevas.
