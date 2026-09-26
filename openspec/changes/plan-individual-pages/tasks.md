# Tasks

## 1. Helpers de plan

- [x] 1.1 Crear `lib/plans.ts` con `planSlug(name: string): string` (minúsculas, sin diacríticos vía `normalize('NFD')`, no alfanumérico → `-`, recorte de guiones) y `parsePlanFeatures(features: string): string[]` (parseo seguro de JSON array con fallback `[]`). Verificar con casos: `"Plan Básico"` → `plan-basico`, `"  Radio + TV!! "` → `radio-tv`, string inválido → `[]`.
- [x] 1.2 Reutilizar el tipo `PublicPlan` de `components/public/SignupForm.tsx` y exponer en `lib/plans.ts` un mapper de `Plan` → `PublicPlan` (incluyendo `features` completas) para uso de la página. Verificar que el mapper compila con `npm run build` o `npx tsc --noEmit`.

## 2. Modo de plan único en el formulario

- [x] 2.1 Agregar a `components/public/SignupForm.tsx` una prop opcional `fixedPlanId?: string`. Cuando viene, inicializar `planId` con ese valor y ocultar la lista seleccionable, mostrando en su lugar un resumen/card del plan fijo (nombre, precio, intervalo, servicios). Verificar que en la página del plan no se puede cambiar de plan.
- [x] 2.2 Asegurar que sin `fixedPlanId` el comportamiento de `/registro` no cambia (misma lista, preselección y envío). Verificar entrando a `/registro` y comprobando que el selector y el flujo siguen funcionando.
- [x] 2.3 Verificar que el envío sigue usando `POST /api/auth/register` con el `planId` correcto y que el estado de éxito y el link a login se mantienen. Verificar registrando una cuenta de prueba desde el formulario fijo (o revisando el payload en el navegador).

## 3. Página individual del plan

- [x] 3.1 Crear `app/planes/[slug]/page.tsx` como Server Component con `export const dynamic = 'force-dynamic'`, que consulte los planes activos, resuelva el slug con `planSlug` y llame `notFound()` si no hay coincidencia. Verificar que un slug inexistente responde 404.
- [x] 3.2 Renderizar las características completas del plan (nombre, descripción, precio/moneda/intervalo, servicios, cuotas de almacenamiento, imagen, chip de servicio, badge "Más popular") reutilizando el estilo de `/registro`. Verificar visualmente que la lista de `features` no queda truncada.
- [x] 3.3 Montar `SignupForm` con `fixedPlanId` apuntando al plan de la página. Verificar que el formulario se muestra con el plan correcto y no permite cambiarlo.
- [x] 3.4 Agregar `generateMetadata` que derive `title` y `description` del plan. Verificar el `<title>`/description en el HTML de la página.

## 4. Verificación de integración

- [x] 4.1 Verificar el flujo completo: entrar a `/planes/<slug>` de un plan activo, completar el formulario y confirmar que se crea la cuenta con la suscripción de ese plan (revisar en admin o DB). 
- [x] 4.2 Verificar 404 para plan inactivo/inexistente y que `/registro` sigue funcionando igual.
- [x] 4.3 Ejecutar `npm run lint` y `npm run build` sin errores y correr `openspec validate plan-individual-pages --strict`.
