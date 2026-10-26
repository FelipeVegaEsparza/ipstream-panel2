# Tasks

## 1. Modelo de datos y migración

- [x] 1.1 Agregar `AiCreditPack`, `AiCreditRequest` y `AiCreditGrant` a `prisma/schema.prisma`, con relaciones en `Client` y `AiCreditPack`, snapshots de precio/créditos, estados, índices y cascade; verificar con `npx prisma validate` y `npx prisma generate`.
- [x] 1.2 Crear la migración `prisma/migrations/<timestamp>_add_ai_credit_packs/migration.sql` con las tres tablas, índices y FKs; verificar que la migración refleje el schema.
- [x] 1.3 Confirmar que `AiCreditGrant.requestId` es único cuando proviene de una solicitud y registrar que la regla de “una solicitud pendiente por cliente/paquete” se valida en la capa de solicitud, no con un índice que impida volver a solicitar tras un rechazo.

## 2. Saldo adicional y cuotas efectivas

- [x] 2.1 Crear `lib/ai-credits.ts` con consulta de saldo por cliente, consumo FIFO de caracteres y música, error de saldo insuficiente y helpers de otorgamiento; verificar con `lib/ai-credits.test.ts` que descuente el otorgamiento más antiguo y nunca deje saldos negativos.
- [x] 2.2 Extender `getAiLiveAccess` y `getAiMusicAccess` para incluir saldo adicional en `remaining`, exponer `extraRemaining`/`extraRemainingSeconds` y mantener `used` como uso del plan; verificar con tests de acceso que la cuota efectiva suma plan + extras.
- [x] 2.3 Extender `consumeAiCharacters` y `consumeAiMusicSeconds` para repartir el consumo plan → extras dentro de una transacción, registrar el total mensual y el evento completo, y revertir si el saldo no alcanza; verificar con tests de reparto, agotamiento y rollback.
- [x] 2.4 Revisar las rutas de locución libre, clima/hora, AutoDJ, cápsulas y jingles para que sigan usando `access.remaining` como cuota efectiva y no dupliquen lógica de extras; verificar con `npx tsc --noEmit` y una búsqueda de consumos sin función.

## 3. APIs del administrador

- [x] 3.1 Crear `app/api/admin/ai-credit-packs/route.ts` y `[id]/route.ts` para listar, crear, editar y activar/desactivar paquetes; validar nombre, tipo, cantidad, precio, moneda y que no se eliminen paquetes con ventas; verificar con `npx tsc --noEmit` y una prueba de validación.
- [x] 3.2 Crear la aprobación/rechazo de solicitudes en `app/api/admin/ai-credit-requests/[id]/route.ts`; aprobar debe crear `Payment` completado sin suscripción, `AiCreditGrant` y actualizar la solicitud en una transacción; rechazar no debe crear pago ni saldo.
- [x] 3.3 Crear la venta directa en `app/api/admin/ai-credit-grants/route.ts` para un cliente y paquete, con método/fecha de pago y snapshot de créditos; verificar que el pago quede en el historial del cliente.
- [x] 3.4 Agregar tests de APIs admin con mocks de Prisma: solo admin, aprobación crea pago+saldo, rechazo no crea nada y venta directa no requiere solicitud.

## 4. Vista y solicitudes del cliente

- [x] 4.1 Crear `app/api/dashboard/ai-credits/requests/route.ts` para solicitar un paquete activo, guardar snapshot de precio/moneda y evitar una segunda solicitud pendiente del mismo paquete; verificar 400/403/404 y aislamiento por cliente.
- [x] 4.2 Ampliar la consulta de Consumo IA del cliente para incluir saldo adicional, paquetes activos y solicitudes propias; verificar que no exponga datos de otros clientes.
- [x] 4.3 Extender `components/dashboard/AiUsageView.tsx` con saldos adicionales, catálogo de paquetes, botón de solicitud, historial de solicitudes y aviso destacado cuando la cuota efectiva es cero y hay paquetes.
- [x] 4.4 Agregar `hasActivePacks` a `AiCreditsCard` y mostrar “Comprar más” hacia `/dashboard/consumo-ia` solo cuando el saldo efectivo es cero y hay paquetes activos; verificar que la tarjeta siga mostrando la cuota actual.
- [x] 4.5 Agregar textos ES/EN para tipos de crédito, paquetes, estados de solicitud, avisos y estados vacíos; verificar `lib/dashboard-i18n.test.ts` y que no queden claves sin traducir.

## 5. Gestión del administrador

- [x] 5.1 Agregar el ítem “Paquetes IA” al grupo Clientes y Pagos de `components/admin/AdminSidebar.tsx` y su traducción; verificar que marque activo en `/admin/paquetes-ia`.
- [x] 5.2 Crear `app/admin/paquetes-ia/page.tsx` con catálogo, solicitudes pendientes, venta directa e historial de otorgamientos, accesible solo a administradores.
- [x] 5.3 Crear el componente cliente de gestión con formulario de paquete, lista de solicitudes con aprobar/rechazar, formulario de venta directa y tabla de otorgamientos; verificar con datos de prueba que un paquete desactivado no aparezca para nuevas solicitudes.
- [x] 5.4 Agregar enlace “Gestionar paquetes” en `/admin/consumo-ia` y los textos ES/EN del panel admin; verificar la navegación y que el layout admin siga bloqueando a no administradores.

## 6. Verificación de integración

- [x] 6.1 Ejecutar `npx tsc --noEmit`, `npm test` y `npm run build`; corregir errores de tipos, pruebas o compilación.
- [x] 6.2 Verificar el flujo completo con datos de prueba: cliente solicita, admin aprueba, se crea pago y saldo, el cliente consume más allá de su cuota y el saldo extra baja sin desaparecer al cambiar de mes.
- [x] 6.3 Verificar que un cliente sin saldo vea el aviso y que un cliente con paquetes inactivos o sin paquetes no vea el aviso de compra.
- [x] 6.4 Confirmar que no se modifican archivos del agente de streaming ni se requiere “Actualizar nodo”.
