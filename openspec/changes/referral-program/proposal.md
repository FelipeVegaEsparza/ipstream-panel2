# Proposal

## Why

CasterFly no tiene un canal de crecimiento orgánico medible: los clientes recomiendan la plataforma de forma informal y no reciben ningún incentivo, mientras el equipo comercial no puede atribuir altas a un referente ni distinguir recomendaciones reales de cuentas duplicadas. Un programa de referidos con recompensas de meses gratis, validado contra pagos reales, convierte la recomendación en un incentivo sostenible y auditable, sin tocar los precios ni el flujo de cobro existente.

## What Changes

- Cada cliente recibe un **código de referido único y permanente** (`CAST-XXXXXXXX`) y un enlace público `https://<dominio-panel>/registro?ref=<código>`.
- El registro público captura el código, lo valida en el backend y lo **persiste en la base de datos** junto al cliente nuevo (sin depender solo de cookies). El referente queda bloqueado después del registro.
- Nuevo modelo de **referidos** con estados: registrado, pendiente de contratación, pendiente de primer pago, primer pago confirmado, pendiente de segundo pago, válido y rechazado. La validación se calcula exclusivamente desde `payments` confirmados (nunca desde el frontend).
- **2 referidos válidos = 1 mes gratis**. Los referidos válidos se acumulan (3 → 1 recompensa + progreso 1/2; 4 → 2 recompensas) y no hay límite de recompensas.
- **Recompensas** registradas individualmente (cliente, fecha, meses, valor histórico inmutable, estado, fecha de aplicación, suscripción). Generación idempotente y transaccional con índice único por slot, para que reintentos o validaciones concurrentes no dupliquen premios.
- **Valor de la recompensa** = mensualidad del menor precio entre el plan del referente y el del referido al completarse el segundo pago. Precios anuales se normalizan a mensual. Monedas distintas se convierten con una **tasa CLP/USD configurable** y se congelan en la recompensa.
- **Crédito aplicado automáticamente** a futuras renovaciones: un ledger de crédito cubre total o parcialmente el siguiente pago impago; si cubre el total, el pago queda cubierto sin cargo. Nunca se aplica a períodos ya pagados y no se convierte en dinero.
- Nueva sección **Programa de Referidos** en el dashboard del cliente: resumen, enlace con copiar/compartir, progreso visual, historial de referidos e historial de recompensas.
- Nueva sección **admin** (`/admin/referidos`): KPIs, búsqueda por cliente/código/período, detalle de pagos que validaron cada referido, recompensas generadas/usadas, anulación justificada y auditoría de cada operación.
- **Centro de notificaciones in-app** para el cliente (campana + contador, nuevo modelo reutilizable): registro por enlace, primer pago, segundo pago, recompensa generada, mes aplicado y cambios administrativos. Se mantienen intactos el push OneSignal y los correos actuales.
- Seguridad: no auto-referencia, atribución única e inmutable, detección de duplicados por email/IP, exclusión de pagos fallidos/pendientes/de prueba/duplicados/anulados/reembolsados, pagos cubiertos por crédito no cuentan como validación, y reversión auditada ante reembolso o contracargo.
- **BREAKING**: ninguno. Migraciones aditivas; los clientes existentes reciben su código de forma perezosa y conservan planes, suscripciones y pagos.

## Capabilities

### New Capabilities

- `referrals/program`: elegibilidad del referente, generación y permanencia del código único, enlace de invitación y reglas generales del programa (sin límite de referidos ni de recompensas).
- `referrals/attribution`: captura del código en el registro público, validación en backend, persistencia de la atribución, inmutabilidad del referente y bloqueo de auto-referencia.
- `referrals/validation`: estados del referido, confirmación de los dos pagos consecutivos desde registros reales, idempotencia, exclusión de pagos no válidos, fraude/duplicidad y reversión por reembolso o contracargo.
- `referrals/rewards`: regla 2→1, progreso acumulado, valor histórico de la recompensa (mínimo entre planes + tasa de cambio), estados de la recompensa y ledger de crédito aplicado automáticamente a renovaciones.
- `referrals/dashboard`: API y sección `/dashboard/referidos` con resumen, enlace, progreso e historiales, sin exponer datos financieros de terceros.
- `referrals/admin`: API y sección `/admin/referidos` con indicadores, búsqueda, detalle de validaciones, anulación de recompensas y auditoría.
- `referrals/notifications`: centro de notificaciones in-app del panel (modelo, campana, contador, marcado como leído) y los eventos del programa que lo alimentan.

### Modified Capabilities

<!-- Sin cambios de requisitos en specs existentes: push OneSignal, email y facturación conservan su comportamiento. -->

## Impact

- **Prisma / MySQL**: nuevas tablas `referrals`, `referral_payments`, `referral_rewards`, `referral_credit_ledger`, `referral_audit_logs`, `client_notifications`; columnas aditivas en `clients` (`referralCode` único), en `payments` (`creditApplied`, `creditCurrency`) y en `app_config` (`referralFxUsdClp`). Migración nueva, sin pérdida de datos.
- **Registro público**: `app/registro/page.tsx`, `components/public/SignupForm.tsx` (lectura de `?ref=`), `lib/validations.ts` (`registerSchema`), `app/api/auth/register/route.ts` (atribución dentro de la transacción) y `app/api/public/referral/[code]/validate/route.ts`.
- **Facturación**: `lib/payment-generator.ts` y `lib/billing-payments.ts` invocan el motor de créditos después de generar/confirmar pagos. Ningún cambio de precios ni de las reglas de renovación/suspensión; el pago conserva su `amount` y expone `creditApplied` para el neto.
- **Nuevo dominio de referidos**: `lib/referrals/*` (código, atribución, validación, recompensas, crédito, auditoría, notificaciones) con tests en `lib/*.test.ts` (Vitest, patrón `fakeDb`).
- **Nuevas APIs de cliente**: `/api/dashboard/referrals` y `/api/dashboard/notifications/*`; **APIs admin**: `/api/admin/referrals/*` (listado, detalle, anular recompensa, marcar reembolso) y `/api/admin/app-config/referral-fx` o reutilización de `app-config`.
- **UI**: nueva entrada `referrals` en `lib/menu-items.ts` y `MenuItemKey`; página `/dashboard/referidos` con componentes en `components/dashboard/referrals/*`; página `/admin/referidos` con componentes en `components/admin/referrals/*`; entrada en `components/admin/AdminSidebar.tsx`; campana en `components/dashboard/Header.tsx` o `Sidebar.tsx`.
- **Tareas de fondo**: poller de créditos (barrido de pagos pendientes con crédito disponible) arrancado desde `instrumentation.ts`, con guardas de idempotencia.
- **Operación**: cambio solo de panel (Next.js/Prisma); **no requiere "Actualizar nodo"** en servidores de streaming. Sin nuevas dependencias npm.
- **Compatibilidad**: clientes y suscripciones existentes no se modifican; el código de referido se genera al primer acceso al programa o al primer registro atribuido.
