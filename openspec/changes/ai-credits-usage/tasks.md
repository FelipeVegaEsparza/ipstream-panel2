# Tasks

## 1. Modelo y registro por función

- [x] 1.1 Agregar `model AiUsageEvent` a `prisma/schema.prisma` (`clientId`, `period`, `feature`, `characters`, `musicSeconds`, `createdAt`, índices y cascade) y la relación `aiUsageEvents AiUsageEvent[]` en `model Client`; verificar con `npx prisma validate` y `npx prisma generate`.
- [x] 1.2 Crear la migración `prisma/migrations/<timestamp>_add_ai_usage_events/migration.sql` con tabla, índices y FK cascade; verificar que la migración coincida con el schema.
- [x] 1.3 Crear `lib/ai-usage.ts` con el catálogo de funciones (`live-locution`, `live-announce`, `autodj-presenter`, `ai-capsule`, `ai-jingle`), helpers de períodos UTC y tipos compartidos; verificar con `lib/ai-usage.test.ts` que el rango de 7 períodos incluya el mes actual y los 6 anteriores y respete UTC.
- [x] 1.4 Extender `consumeAiCharacters` y `consumeAiMusicSeconds` para recibir una función obligatoria y escribir el total mensual más el evento de detalle en una transacción; verificar con `lib/ai-usage-tracking.test.ts` que se cree el evento correcto y que no se registre nada con consumo cero.
- [x] 1.5 Instrumentar los consumos: locución libre, clima/hora, presentador AutoDJ, cápsulas IA, jingles IA y cama musical de cápsulas; verificar con `npx tsc --noEmit` y una búsqueda de `consumeAiCharacters`/`consumeAiMusicSeconds` sin función.

## 2. Agregaciones del cliente y del administrador

- [x] 2.1 Implementar en `lib/ai-usage.ts` la consulta del cliente para el mes actual y los 6 períodos anteriores: cuotas vigentes, totales mensuales, desglose por función y remanente “Sin detalle histórico”; verificar con `lib/ai-usage-aggregation.test.ts` cubriendo totales, desglose y diferencia histórica.
- [x] 2.2 Implementar la consulta global del administrador: totales del mes, desglose por función, ranking de clientes con consumo y totales del mes actual y los 6 meses anteriores; verificar con `lib/ai-usage-aggregation.test.ts` cubriendo agrupación por cliente y exclusión de clientes sin consumo.
- [x] 2.3 Agregar textos ES/EN de etiquetas de funciones y formato de caracteres/minutos; verificar `lib/dashboard-i18n.test.ts` y que no queden claves sin traducir.

## 3. Vista del cliente

- [x] 3.1 Agregar la clave `ai-usage` y el ítem “Consumo IA” en el grupo General de `lib/menu-items.ts`; verificar que aparezca en el sidebar y en la configuración de menú.
- [x] 3.2 Crear `app/dashboard/consumo-ia/page.tsx` con `getEffectiveClient` y la consulta de consumo del cliente; verificar que un cliente sin IA vea un estado informativo sin error.
- [x] 3.3 Crear el componente de presentación de Consumo IA con tarjetas de cuota de caracteres y música, desglose por función, fila “Sin detalle histórico” y tabla del mes actual y los 6 meses anteriores; verificar visualmente en desarrollo que los datos coincidan con los totales.
- [x] 3.4 Agregar el enlace “Ver detalle” en `components/dashboard/AiCreditsCard.tsx` hacia `/dashboard/consumo-ia`; verificar que el enlace funcione y que la tarjeta siga mostrando la cuota actual.
- [x] 3.5 Verificar aislamiento: con dos clientes con consumo distinto, cada uno debe ver solo sus datos y el modo impersonación debe mostrar el cliente efectivo.

## 4. Vista del administrador

- [x] 4.1 Agregar el ítem “Consumo IA” al grupo Clientes y Pagos de `components/admin/AdminSidebar.tsx` y su traducción en `ADMIN_MENU_NAME_EN`; verificar que el ítem aparezca y marque activo en la ruta.
- [x] 4.2 Crear `app/admin/consumo-ia/page.tsx` con validación de rol `ADMIN` y la consulta global de consumo; verificar que un usuario no admin sea redirigido por el layout.
- [x] 4.3 Crear el componente admin con totales globales, desglose por función, tabla de clientes ordenada por consumo y totales del mes actual y los 6 meses anteriores; verificar con datos de prueba que el ranking excluya clientes sin consumo.
- [x] 4.4 Verificar que el total global sea la suma de los clientes del mes y que la fila “Sin detalle histórico” global también respete la diferencia entre totales y eventos.

## 5. Verificación de integración

- [x] 5.1 Ejecutar `npx tsc --noEmit` y `npm test` en la raíz; corregir cualquier error de tipos o prueba fallida.
- [x] 5.2 Ejecutar el panel en desarrollo con al menos dos clientes y consumos de distintas funciones; verificar la vista cliente, la vista admin, el histórico del mes actual más 6 meses y el estado sin IA.
- [x] 5.3 Confirmar que la cuota sigue bloqueando la generación al agotarse y que un audio cacheado no crea eventos ni modifica totales.
- [x] 5.4 Confirmar que el cambio no toca el agente ni requiere “Actualizar nodo”.
