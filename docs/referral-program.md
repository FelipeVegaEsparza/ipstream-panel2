# Programa de Referidos

Documentación operativa y técnica del programa de referidos de CasterFly.

## 1. Reglas del programa

- Cada cliente tiene un **código único y permanente** con formato `CAST-XXXXXXXX` y un enlace `https://<dominio-panel>/planes?ref=<código>` (`panel.casterfly.com` en producción; se configura con `PANEL_PUBLIC_URL` o `NEXTAUTH_URL`).
- Puede participar desde que su cuenta está activa y tiene **al menos una mensualidad pagada y confirmada**.
- No hay límite de referidos ni de recompensas.
- **2 referidos válidos = 1 mes gratis**. Los válidos se acumulan: 3 → 1 recompensa + progreso 1/2; 4 → 2 recompensas.
- Un referido es válido cuando completa **dos pagos consecutivos del ciclo** de su plan (dos mensualidades o dos anualidades) y ambos son pagos reales confirmados.
- Un pago cubierto total o parcialmente por crédito, un pago de prueba, pendiente, fallido, duplicado, anulado o reembolsado **no valida** un referido.
- El referente queda **bloqueado después del registro** del referido. No existe endpoint para cambiarlo.
- Un cliente no puede usar su propio código. Las variantes de email y la coincidencia de IP de registro se marcan para revisión administrativa.

## 2. Estados del referido

| Estado | Significado |
| --- | --- |
| `registered` | Cuenta creada con un código válido. |
| `pending_contract` | Aún no tiene plan/suscripción. |
| `pending_first_payment` | Tiene suscripción, pero no un primer pago válido. |
| `first_payment_confirmed` | Primer pago confirmado; todavía no se emitió el segundo. |
| `pending_second_payment` | Espera el segundo pago o está en revisión. |
| `valid` | Dos pagos consecutivos confirmados y sin bloqueo de revisión. |
| `rejected` | Rechazado por fraude, duplicidad, reembolso o decisión administrativa. |

## 3. Cálculo de la recompensa

Al validarse el segundo referido de un grupo:

1. Se toma el precio **mensual** del plan del referente y del referido en el momento del segundo pago.
2. Los planes anuales se normalizan dividiendo por 12.
3. Si las monedas difieren, se convierte con `app_config.referralFxUsdClp` (CLP por 1 USD) o `REFERRAL_FX_USD_CLP`; por defecto 950.
4. La recompensa vale el **menor** de los dos precios mensuales y se emite en la moneda de facturación del referente.
5. El importe, los precios de ambos planes y la tasa usada quedan congelados en `ReferralReward.priceSnapshot`. Cambiar precios después no altera recompensas existentes.

La tasa se configura en **Admin → Configuración Sistema → Tasa de conversión CLP por 1 USD**.

## 4. Crédito y renovaciones

El crédito se lleva en `referral_credit_ledger` (asientos con signo) y se aplica automáticamente:

| Asiento | Efecto |
| --- | --- |
| `reward` | Suma el valor de una recompensa generada. |
| `application` | Resta lo aplicado a un pago. |
| `void` | Cancela el saldo no usado de una recompensa anulada. |
| `debt` | Descuenta lo ya consumido cuando se anula una recompensa usada. |
| `adjustment` | Devuelve crédito tras un reembolso de un pago cubierto. |

- Se aplica a los pagos `pending`/`failed` con vencimiento posterior a la generación de la recompensa; nunca a períodos ya pagados.
- Si cubre el total, el pago queda `completed` con método `referral_credit` y la suscripción avanza, sin correo de boleta ni cargo.
- Si cubre una parte, el pago conserva su importe nominal y expone `creditApplied`; el cliente paga la diferencia.
- Varios meses se aplican en ciclos consecutivos (tope de 24 por ejecución).
- El importe neto visible es `payment.amount - payment.creditApplied`.
- El crédito no se convierte en dinero, no se transfiere y no se retira.
- Además de los hooks de pago, se aplica al asignar un plan, al renovar una suscripción y al regenerar cuotas desde el admin, para que no se emita un cargo si hay saldo suficiente.

## 5. Atribución en el registro

El único formulario de alta vive en **`/planes/<slug>`**. Existen dos rutas de navegación, pero una sola de registro:

- **`/planes`**: listado de planes. No tiene formulario: muestra los planes y cada tarjeta enlaza a `/planes/<slug>?ref=...`. Es la ruta que usa el enlace de referido para que el referido elija su plan. Usa el mismo diseño oscuro del sitio público y muestra los precios en **USD y CLP** cuando el plan tiene ambas monedas.
- **`/planes/<slug>`**: landing del plan con el formulario de alta. Es la única ruta que crea cuentas y acepta `?ref=`. La usan los enlaces de contratación del sitio público (`contractUrl`).
- **`/registro`**: ruta histórica. Ahora responde **308** hacia `/planes` (o `/planes/<slug>` si recibe `?plan=`), conservando `?ref=`. No renderiza un segundo formulario.

- `/planes/<slug>?ref=CODE` pasa el código a `SignupForm` y al payload de `/api/auth/register`.
- El enlace usa el dominio del panel (`PANEL_PUBLIC_URL`/`NEXTAUTH_URL`) porque el formulario vive ahí; el dominio raíz del sitio público no sirve el alta.
- El backend valida el código, la elegibilidad del referente, el email y la IP, y crea `Referral` **dentro de la misma transacción** que el usuario/cliente.
- Un código inválido o de un referente no elegible no bloquea el registro: responde `referralApplied: false`.
- `Referral.referredClientId` es único; un segundo intento no reemplaza al referente y se audita.
- La atribución no depende de cookies ni de almacenamiento del navegador.

## 6. Endpoints

### Cliente (sesión de cliente o admin impersonando)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/dashboard/referrals` | Resumen, enlace, progreso, referidos y recompensas del cliente autenticado. |
| GET | `/api/dashboard/notifications` | Lista de notificaciones in-app + contador de no leídas. |
| PATCH | `/api/dashboard/notifications` | `{ id }` marca una; `{ all: true }` marca todas. |

### Público

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/public/referral/[code]/validate` | Indica si el código existe y su referente es elegible, sin revelar datos. |

### Admin (rol `ADMIN`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/admin/referrals?query&status&from&to&page&pageSize` | Referentes, referidos, recompensas, KPIs y revisión. |
| GET | `/api/admin/referrals/[id]` | Detalle de un referido, pagos y auditoría. |
| POST | `/api/admin/referrals/[id]/flag` | `{ action: "approve" \| "reject", reason }`. |
| POST | `/api/admin/referral-rewards/[id]/void` | `{ reason }` obligatorio; anula y genera deuda si corresponde. |
| GET | `/api/admin/referrals/audit` | Historial de operaciones. |
| POST | `/api/admin/payments/[id]/refund` | Marca el pago como reembolsado y dispara la revisión del referido. |

Todas las rutas admin verifican `session.user.role === 'ADMIN'` y devuelven 401 en caso contrario.

## 7. Notificaciones

Centro in-app (`client_notifications`), independiente de OneSignal y del correo:

- Nuevo referido registrado.
- Primer pago confirmado.
- Referido válido (segundo pago).
- Recompensa generada.
- Crédito aplicado a una renovación.
- Cambio administrativo (anulación/rechazo).

Cada evento usa una `eventKey` única (`referral:<id>:registered`, `reward:<id>:created`, etc.) y `createMany({ skipDuplicates: true })`, por lo que reintentos y webhooks duplicados no generan avisos repetidos. La campana del header consulta cada 30 segundos.

## 8. Reembolsos y contracargos

1. El admin pulsa **Marcar reembolso** en el detalle del referido o llama `POST /api/admin/payments/[id]/refund`.
2. El pago pasa a `refunded`.
3. Si ese pago validó un referido, el referido sale del conteo (`valid` → pendiente) y queda `flagged` con motivo `payment_refunded`; sus recompensas quedan `reviewRequired`.
4. Si el pago estaba cubierto por crédito, se crea un asiento `adjustment` que devuelve el saldo.
5. En **Admin → Programa de Referidos → Revisión**, el admin decide:
   - **Aprobar**: limpia la marca, recalcula y, si corresponde, vuelve a `valid`.
   - **Rechazar**: exige motivo, pasa a `rejected` y anula las recompensas del referido (con `void`/`debt` si ya se usaron).
6. Toda decisión queda en `referral_audit_logs` y se notifica al cliente.

## 9. Poller de respaldo

`lib/referral-poller.ts` arranca desde `instrumentation.ts` (respeta `PANEL_POLLER=0`). Cada 15 minutos:

- Recalcula referidos no válidos con actividad en los últimos 7 días.
- Aplica crédito disponible a pagos pendientes.
- Registra errores sin detener el proceso.

Los hooks de `markPaymentPaid` y `completePaymentAndGenerateNext` siguen siendo la vía principal; el poller cubre webhooks perdidos o reinicios.

## 10. Migración y rollback

```bash
# Local
npx prisma generate
npx prisma migrate dev --name referral_program

# Producción
# El deploy de GitHub Actions aplica el esquema/migración al arrancar el panel.
```

- Migración: `prisma/migrations/20261118000000_referral_program/migration.sql`.
- Verificada contra el DDL generado por `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` (tablas, columnas, índices y FKs coinciden).
- Es **aditiva**: crea `referrals`, `referral_payments`, `referral_rewards`, `referral_credit_ledger`, `referral_audit_logs`, `client_notifications` y agrega columnas nullable/default (`clients.referralCode`, `payments.creditApplied`, `payments.creditCurrency`, `app_config.referralFxUsdClp`).
- No hay backfill: `referralCode` se genera de forma perezosa al entrar al programa o al recibir un referido.
- Rollback: desplegar la imagen anterior. Las tablas y columnas quedan sin uso y no rompen la aplicación; los datos se conservan para reintentar.
- **No requiere "Actualizar nodo"**: es un cambio solo de panel (Next.js/Prisma), no toca el agente de streaming.

**Limitación del entorno de desarrollo:** no había un servidor MySQL accesible en la máquina local, por lo que la migración se validó con `npx prisma validate`/`prisma generate` y comparación contra el DDL generado. En producción el entrypoint aplicó el esquema con `prisma db push` y las tablas/columnas respondieron correctamente.

## 11. Pruebas

```bash
npx tsc --noEmit
npm test
npx vitest run lib/referral-*.test.ts
```

Archivos de prueba:

- `lib/referral-codes.test.ts`
- `lib/referral-eligibility.test.ts`
- `lib/referral-attribution.test.ts`
- `lib/referral-validation.test.ts`
- `lib/referral-rewards.test.ts`
- `lib/referral-credit.test.ts`
- `lib/referral-notifications.test.ts`
- `lib/referral-reversal.test.ts`
- `lib/referral-dashboard.test.ts`
- `lib/referral-admin.test.ts`
- `lib/referral-payment-hooks.test.ts`
- `lib/referral-api-guard.test.ts`

Correspondencia con los doce escenarios obligatorios:

| # | Escenario | Evidencia |
| --- | --- | --- |
| 1 | Referido registrado sin pagar | `referral-validation.test.ts` (sin pago / pendiente) |
| 2 | Un solo pago | `referral-validation.test.ts` (primer pago confirmado) |
| 3 | Dos pagos consecutivos | `referral-validation.test.ts` (válido + recompensa) |
| 4 | Dos válidos → una recompensa | `referral-rewards.test.ts` |
| 5 | Tres válidos → una + progreso 1/2 | `referral-rewards.test.ts`, `computeReferralProgress` |
| 6 | Cuatro válidos → dos recompensas | `referral-rewards.test.ts` |
| 7 | Pago procesado dos veces | `selectValidationPayments` deduplica; `recalculateReferral` idempotente |
| 8 | Código propio | `referral-attribution.test.ts` (self_referral) |
| 9 | Referente inmutable | `referral-attribution.test.ts` (`attachReferralToClient`) |
| 10 | Recompensa aplicada a renovación | `referral-credit.test.ts` (cobertura total) |
| 11 | Planes de distinto precio | `referral-rewards.test.ts` (mínimo y conversión) |
| 12 | Cliente existente conserva datos | `ensureReferralCode` no toca suscripción/pagos; `referral-dashboard.test.ts` |

**Pendiente de verificación manual:** el flujo completo con una base de datos real (alta con `?ref=`, activación, dos pagos, recompensa y aplicación a la renovación) no pudo ejecutarse en este entorno por no haber MySQL disponible.

## 12. Verificación en producción (2026-11-18)

El flujo completo se ejecutó contra el VPS de producción después del deploy de `13357f8`:

1. Un cliente elegible generó su código de forma perezosa al abrir `/api/dashboard/referrals` y recibió un enlace `https://panel.casterfly.com/planes?ref=...`.
2. Se registró una cuenta nueva con ese enlace: la API respondió `referralApplied: true`, el `Referral` quedó en estado `registered` y el referente recibió la notificación de nuevo referido.
3. Se asignó un plan a la cuenta QA: la primera cuota nació completada y el referido pasó a `first_payment_confirmed` (hook de primera cuota).
4. Se registró el segundo pago desde el admin: el referido pasó a `valid`, se guardaron los dos `ReferralPayment` y el referente recibió la notificación de referido válido.
5. Con el segundo referido válido se generó **una recompensa** de 29.990 CLP, su asiento `reward` en el ledger y la notificación "Ganaste un mes gratis".
6. Se renovó la suscripción del referente: el crédito cubrió el 100% del pago, que quedó `completed` con método `referral_credit` (`creditApplied = amount`), la recompensa pasó a `applied` y se creó el siguiente pago pendiente.
7. Se verificaron las APIs y páginas: `/api/dashboard/referrals`, `/api/dashboard/notifications`, `/api/admin/referrals`, `/api/admin/referrals/[id]`, `/dashboard/referidos` y `/admin/referidos` respondieron 200; marcar una notificación y marcar todas funcionó.
8. Se eliminaron las cuentas y datos QA: referidos, recompensas, ledger, notificaciones y pagos de prueba quedaron en cero; la suscripción del cliente usado como referente se restauró a su fecha original.
