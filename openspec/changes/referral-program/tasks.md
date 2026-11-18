# Tasks

## 1. Esquema, migración y utilidades base

- [x] 1.1 Agregar a `prisma/schema.prisma` `Client.referralCode` (`String? @unique`), `Payment.creditApplied` (`Float @default(0)`), `Payment.creditCurrency`, `AppConfig.referralFxUsdClp` y los modelos `Referral`, `ReferralPayment`, `ReferralReward`, `ReferralCreditLedger`, `ReferralAuditLog` y `ClientNotification` con sus relaciones e índices del diseño; verificar con `npx prisma validate` y `npx prisma generate`.
- [x] 1.2 Crear `prisma/migrations/<timestamp>_referral_program/migration.sql` aditivo (tablas, índices únicos `referrals.referredClientId`, `referral_rewards(referrerClientId, slotIndex)`, `client_notifications(clientId, eventKey)` y columnas nullables/default 0); verificar que `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma` no reporte diferencias inesperadas y que el SQL aplique en una DB local.
- [x] 1.3 Crear `lib/referrals/constants.ts` (estados, tipos de notificación, tipos de ledger, límites) y `lib/referrals/codes.ts` (`buildReferralCode`, `ensureReferralCode`, `normalizeReferralCode`, `buildReferralLink`); verificar con tests unitarios de formato, colisión, idempotencia y base URL.
- [x] 1.4 Crear `lib/referrals/eligibility.ts` (`isReferrerEligible`, `assertEligible`) reutilizando las reglas de pago válido de validación; verificar con tests de cuenta inactiva, sin suscripción, sin pagos y con pago confirmado.
- [x] 1.5 Crear `lib/referral-codes.test.ts` y `lib/referral-eligibility.test.ts` con el patrón `fakeDb` existente; ejecutar `npm test -- lib/referral-codes.test.ts lib/referral-eligibility.test.ts` y confirmar que pasan.

## 2. Captura y atribución en el registro

- [x] 2.1 Extender `registerSchema` en `lib/validations.ts` con `referralCode` opcional (trim, longitud y patrón) y verificar que los registros sin código siguen validando; test en `lib/referral-attribution.test.ts`.
- [x] 2.2 Leer `searchParams.ref` en `app/registro/page.tsx`, pasarlo como prop a `components/public/SignupForm.tsx` y enviarlo en el payload del formulario sin perderlo al cambiar de plan/moneda; verificar manualmente `/registro?ref=CAST-XXXX` y que el body de la request incluye el código (test de componente o de serialización).
- [x] 2.3 Implementar `lib/referrals/attribution.ts` (`resolveReferralAttribution`) que valide código existente, referente elegible, email no coincidente y marque `flagged` por IP/alias; verificar con tests de código inválido, no elegible, propio y duplicado.
- [x] 2.4 Integrar la atribución dentro de la transacción de `app/api/auth/register/route.ts`, creando el `Referral` junto al cliente y devolviendo `referralApplied` sin exponer datos del referente; verificar con tests de la ruta o de la función transaccional y una prueba manual de alta con y sin `ref`.
- [x] 2.5 Impedir cambios posteriores del referente (sin endpoint de edición, sin campo en formularios admin) y auditar el intento de segunda atribución; verificar con test de constraint `referredClientId` único y con búsqueda global de endpoints que no exista un `PATCH` de `referrerClientId`.
- [x] 2.6 Agregar tests de los escenarios 8, 9 y 12 del requerimiento en `lib/referral-attribution.test.ts`: código propio rechazado, referente inmutable y cliente existente que recibe código sin perder datos; ejecutar `npm test -- lib/referral-attribution.test.ts`.

## 3. Motor de validación de referidos

- [x] 3.1 Implementar `lib/referrals/validation.ts` con `isValidationPayment`, `expectedCycleDates`, `selectValidationPayments`, `recalculateReferral` y `onPaymentConfirmed`, aplicando las exclusiones de pendientes, fallidos, prueba, duplicados, crédito y reembolsos del diseño; verificar con tests de 0, 1 y 2 pagos y de cada exclusión.
- [x] 3.2 Implementar las transiciones de estado (`registered` → `pending_contract` → `pending_first_payment` → `first_payment_confirmed` → `pending_second_payment` → `valid`/`rejected`) y la persistencia de `firstPaidAt`, `secondPaidAt`, `validatedAt` y `ReferralPayment`; verificar con tests de secuencia completa y de pago intermedio faltante.
- [x] 3.3 Enganchar `onPaymentConfirmed` después del commit en `lib/billing-payments.ts` (`markPaymentPaid`) y en `lib/payment-generator.ts` (`completePaymentAndGenerateNext`) con importación dinámica; verificar con tests de ambos caminos y con un test de que un fallo del hook no rompe la confirmación del pago.
- [x] 3.4 Implementar `lib/referrals/reversal.ts` (`handlePaymentReversed`) para marcar en revisión el referido y sus recompensas ante un reembolso; verificar con tests de pago reembolsado con y sin recompensa y de referido aún no válido.
- [x] 3.5 Agregar `lib/referral-validation.test.ts` con los escenarios 1, 2, 3, 7 y 10 del requerimiento, además de concurrencia/reintento idempotente; ejecutar `npm test -- lib/referral-validation.test.ts`.

## 4. Recompensas y crédito

- [x] 4.1 Implementar `lib/referrals/rewards.ts` con `computeReferralProgress`, `computeRewardValue` (mínimo entre planes, normalización anual, CLP↔USD y snapshot histórico) y `generateRewardForSlot` transaccional con bloqueo por cliente e índice único; verificar con tests de 1/2/3/4/10 válidos, planes iguales/distintos, anuales y monedas mixtas.
- [x] 4.2 Implementar `lib/referrals/credit.ts` con `getCreditBalance`, `applyReferralCredits`, cobertura total/parcial, FIFO, tope de 24 ciclos y avance de suscripción sin correo de boleta; verificar con tests de saldo, deuda negativa, pago ya pagado y varios meses consecutivos.
- [x] 4.3 Integrar la aplicación de crédito tras generar una recompensa, tras confirmar un pago y desde el poller de respaldo; verificar que un reembolso y una anulación producen las entradas `adjustment`/`debt` correctas en el ledger.
- [x] 4.4 Actualizar las vistas de pagos del cliente y admin para mostrar el neto `amount - creditApplied` y un badge "Cubierto por crédito"/"Parcial" solo cuando `creditApplied > 0`; verificar con test de formateo y revisión visual en ambos temas.
- [x] 4.5 Agregar `lib/referral-rewards.test.ts` y `lib/referral-credit.test.ts` con los escenarios 4, 5, 6, 10 y 11 del requerimiento; ejecutar `npm test -- lib/referral-rewards.test.ts lib/referral-credit.test.ts`.

## 5. Centro de notificaciones in-app

- [x] 5.1 Implementar `lib/notifications.ts` (`notifyClient`, `listNotifications`, `markNotificationRead`, `markAllRead`) con `eventKey` único y `createMany({ skipDuplicates: true })`; verificar con tests de duplicado, aislamiento por cliente y marcado como leído.
- [x] 5.2 Crear `GET /api/dashboard/notifications` (lista + contador) y `PATCH /api/dashboard/notifications` (marcar una o todas) derivando el cliente de la sesión; verificar con tests de no autorizado y de intento de leer una notificación ajena.
- [x] 5.3 Crear `components/dashboard/NotificationBell.tsx` y una vista de notificaciones, integrarlos en el layout/header con polling cada 30 s al estilo del badge de mensajes; verificar el contador en tiempo de ejecución y el estado vacío.
- [x] 5.4 Conectar los eventos del programa: registro, primer pago, segundo pago/validación, recompensa generada, crédito aplicado y cambio administrativo, cada uno con su `eventKey`; verificar con tests de que cada evento crea exactamente una notificación.
- [x] 5.5 Agregar `lib/referral-notifications.test.ts` y ejecutar `npm test -- lib/referral-notifications.test.ts`; confirmar que no se modificó el envío de push de `app/api/dashboard/push-notifications` ni los hooks de correo.

## 6. API y dashboard del cliente

- [x] 6.1 Agregar `referrals` a `MenuItemKey` y `MENU_ITEMS` en `lib/menu-items.ts` (sección General, icono adecuado) y su etiqueta en `lib/dashboard-i18n.ts` para español e inglés; verificar que `filterMenuItems` y la configuración de menú del admin lo respetan.
- [x] 6.2 Implementar `GET /api/dashboard/referrals` con resumen (totales, meses acumulados/disponibles/utilizados, progreso), enlace, referidos e historial de recompensas, todo derivado de la sesión y sin datos financieros de terceros; verificar con tests de contrato de respuesta y de aislamiento.
- [x] 6.3 Crear `app/dashboard/referidos/page.tsx` con guard de sesión y de menú (`isMenuItemEnabled`), y los componentes `components/dashboard/referrals/*` (resumen, enlace con copiar/compartir, progreso, tabla de referidos, tabla de recompensas, estado no elegible); verificar con `npx tsc --noEmit` y revisión visual.
- [x] 6.4 Aplicar los tokens de marca (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `brand`) y validar ambos temas; verificar que no se introducen colores crudos ni `text-white` sobre superficies.
- [x] 6.5 Agregar tests de la API y del formateo del dashboard en `lib/referral-dashboard.test.ts`; ejecutar `npm test -- lib/referral-dashboard.test.ts` y confirmar que un cliente no elegible ve el estado correcto.

## 7. Panel administrativo y auditoría

- [x] 7.1 Implementar `lib/referrals/audit.ts` (`recordReferralAudit`) con actor, acción, entidad, valores anterior/nuevo, motivo, IP y fecha, sin endpoints de edición/borrado; verificar con tests de creación y de inmutabilidad.
- [x] 7.2 Crear las rutas `GET /api/admin/referrals`, `GET /api/admin/referrals/[id]`, `POST /api/admin/referrals/[id]/flag`, `POST /api/admin/referral-rewards/[id]/void`, `GET /api/admin/referrals/audit` y `POST /api/admin/payments/[id]/refund`, todas con guard de rol `ADMIN`; verificar con tests de 401/403 y de validación de motivos obligatorios.
- [x] 7.3 Implementar la anulación de recompensas (`available` → `voided`, consumida → deuda en el ledger) y la resolución de revisiones por reembolso, registrando auditoría y notificando al cliente; verificar con tests de ambos casos y del saldo resultante.
- [x] 7.4 Crear `app/admin/referidos/page.tsx` con tabs Resumen / Referentes / Referidos / Recompensas / Revisión / Auditoría, KPIs, búsqueda por nombre/email/código/período y detalle de pagos de validación; agregar la entrada en `components/admin/AdminSidebar.tsx`.
- [x] 7.5 Aplicar el sistema visual existente (tokens, tablas responsive, estados vacíos) y verificar que los indicadores de crédito se agrupan o convierten correctamente por moneda.
- [x] 7.6 Agregar `lib/referral-admin.test.ts` con tests de KPIs, búsqueda, anulación auditada y resolución de reembolsos; ejecutar `npm test -- lib/referral-admin.test.ts`.

## 8. Documentación

- [x] 8.1 Crear `docs/referral-program.md` con reglas del programa, estados, cálculo de recompensas, aplicación de crédito, endpoints, permisos, operación del poller y procedimiento de reembolso/contracargo; verificar que los comandos y rutas documentados coinciden con el código.
- [x] 8.2 Documentar la migración y el rollback en el mismo archivo, incluyendo que el cambio es solo de panel y no requiere "Actualizar nodo"; verificar que un lector pueda ejecutar `npx prisma migrate dev` y `npx prisma generate` sin pasos faltantes.

## 9. Verificación de integración y escenarios obligatorios

- [x] 9.1 Ejecutar `npx tsc --noEmit` y `npm test` completos; confirmar que no hay errores de tipos ni regresiones en los tests existentes.
- [x] 9.2 Probar en local el flujo completo: alta con `?ref=`, activación de cuenta, plan, primer pago, segundo pago, recompensa y aplicación automática a la siguiente renovación; documentar el resultado.
- [x] 9.3 Verificar los doce escenarios obligatorios del requerimiento (sin pago, un pago, dos pagos, 2/3/4 válidos, pago duplicado, código propio, referente inmutable, aplicación a renovación, planes de distinto precio y cliente existente) contra los tests y una ejecución manual; anotar la evidencia en `docs/referral-program.md`.
- [x] 9.4 Verificar que un reembolso de un pago de validación entra en revisión, que la anulación genera deuda y que el cliente recibe la notificación correspondiente.
- [x] 9.5 Revisar que no se modificaron precios, planes, renovaciones ni suspensiones, y que ningún cambio obliga a "Actualizar nodo"; confirmar con `git diff --stat` que el alcance se limitó a panel, Prisma y documentación.
