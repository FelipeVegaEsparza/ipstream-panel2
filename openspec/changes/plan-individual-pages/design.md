# Design

## Context

Ver `proposal.md` — Why. Hoy `/registro` (`app/registro/page.tsx`) lista todos los planes activos y monta `components/public/SignupForm.tsx`, que mantiene el plan seleccionado en estado local (`planId`) y envía `{ name, email, password, planId }` a `POST /api/auth/register`. El endpoint ya resuelve el plan, crea la suscripción (`lib/signup.ts`) y auto-crea los streams según `Plan.services`, por lo que la contratación por plan no necesita backend nuevo.

El modelo `Plan` (`prisma/schema.prisma`) tiene `name` único, `description`, `price`, `currency`, `interval`, `features` (JSON array), `services`, `maxDjs`, cuotas `radioStorageQuotaMB`/`videoStorageQuotaMB` e `imageUrl`, pero no tiene `slug`.

## Goals / Non-Goals

**Goals:**
- Agregar la ruta pública `/planes/[slug]` que muestre las características completas del plan y el formulario con ese plan fijo.
- Resolver el plan por slug derivado del nombre, sin migración de base de datos.
- Reutilizar el formulario y el endpoint de registro existentes, extendiendo `SignupForm` con un modo de plan único.
- Mantener `/registro` intacto.

**Non-Goals:**
- No se agrega `slug` persistido, editor de slug en admin, ni migración Prisma.
- No se modifica `/registro` ni su comportamiento.
- No se cambian `POST /api/auth/register` ni `lib/signup.ts`.
- No se crea un índice de planes en `/planes` (solo páginas por plan).

## Decisions

### 1. Ruta `/planes/[slug]` como Server Component con `force-dynamic`
`app/planes/[slug]/page.tsx` consulta `prisma.plan.findMany({ where: { isActive: true } })`, normaliza el slug de entrada y busca el plan coincidente; si no hay coincidencia llama `notFound()`. Se marca `export const dynamic = 'force-dynamic'` igual que `/registro`, para que los planes se reflejen sin rebuild.

- **Alternativa considerada:** usar el `id` (cuid) en la URL. Se descarta por pedido explícito de URLs amigables tipo `/planes/mi-plan`.
- **Alternativa considerada:** agregar columna `slug`. Se descarta para evitar migración y UI de administración; el nombre único ya permite derivar un slug estable. Si en el futuro se necesita un slug editable, se migra entonces.

### 2. Helper de normalización en `lib/plans.ts`
Se centraliza `planSlug(name)` (minúsculas, `normalize('NFD')` para quitar diacríticos, reemplazo de caracteres no alfanuméricos por `-`, recorte de guiones) y `parsePlanFeatures(features)` (parseo seguro del JSON array con fallback `[]`). Tanto la página como `SignupForm` consumen el mismo formato `PublicPlan` ya definido en `SignupForm`, evitando duplicar el mapeo actual de `/registro`.

- **Conflicto de slugs:** como `name` es único, la normalización no busca unicidad adicional; si dos nombres distintos normalizaran al mismo slug (caso improbable), gana el primero y queda documentado como limitación.

### 3. `SignupForm` con modo de plan único (`fixedPlanId`)
Se agrega una prop opcional `fixedPlanId?: string` (o equivalente). Cuando está presente:
- El plan inicial es ese id y no hay lista seleccionable; se muestra un resumen/card del plan elegido.
- Se oculta el selector de planes para que el visitante no cambie de plan en esa página.
- El resto del flujo (validación, envío a `/api/auth/register`, estado de éxito y link a login) se mantiene idéntico.

Sin la prop, el comportamiento actual de `/registro` no cambia.

- **Alternativa considerada:** crear un componente de formulario separado. Se descarta: duplicaría validación, manejo de errores y el estado de éxito ya probados.

### 4. Reutilizar `POST /api/auth/register`
El formulario envía el `planId` del plan fijo. No se requieren endpoints nuevos ni cambios en la lógica de suscripción/streams.

### 5. Metadatos con `generateMetadata`
La página exporta `generateMetadata` que resuelve el plan por slug y devuelve `title` y `description` derivados de `Plan.name` y `Plan.description`. Si el plan no existe, devuelve metadatos genéricos (la página igual responde 404 por `notFound()`).

### 6. Shell visual consistente con `/registro`
La página reutiliza el header/footer y la tipografía (Outfit, paleta azul, logo) de `/registro` para mantener coherencia con el sitio público. Se mantiene como markup presentacional en la nueva página para no tocar `app/registro/page.tsx`.

- **Alternativa considerada:** extraer un layout compartido y modificar `/registro`. Se descarta para minimizar el impacto sobre una página existente y en producción.

## Risks / Trade-offs

- **Slug no inmutable**: si un plan cambia de nombre, su URL cambia y los enlaces previos dejan de funcionar (404). Mitigación: documentarlo; los enlaces se generan a partir del nombre vigente. Si se requiere estabilidad, migrar a columna `slug` en un cambio futuro.
- **Colisión de slug**: nombres que normalicen igual. Mitigación: `name` es único y la colisión es improbable; se documenta la limitación.
- **Duplicación de shell**: header/footer replicados respecto a `/registro` pueden divergir. Mitigación: son estáticos y de bajo cambio; si crece, extraer un componente compartido.
- **Cambios en `SignupForm`**: afecta `/registro`. Mitigación: la nueva prop es opcional y el camino por defecto queda intacto; verificar `/registro` en las tareas.

## Migration Plan

- Deploy normal vía GitHub Actions. No hay migraciones de base de datos ni variables de entorno. Cambio solo de panel (no toca streaming-agent), por lo que no requiere "Actualizar nodo".
- Rollback: revertir el commit; las rutas nuevas dejan de existir sin afectar datos.

## Open Questions

Ninguna que afecte specs, approach o tasks.
