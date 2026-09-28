# Tasks

## 1. Schema y configuración

- [x] 1.1 Agregar `trialEndsAt DateTime?` a `Subscription` y `trialDays Int @default(7)` a `AppConfig` en `prisma/schema.prisma`; verificar con `npx prisma migrate dev --name free_trial` (o `db:push`) y `npx prisma generate` sin errores.
- [x] 1.2 Definir/reutilizar las constantes de estado de suscripción (`TRIALING`, `ACTIVE`, etc.) en un módulo compartido; verificar con `grep` que no queden literales de estado dispersos en el código tocado.
- [x] 1.3 Agregar `trialDays` editable desde `/admin/settings` (lectura/escritura en `AppConfig`); verificar guardando un valor y comprobando en `prisma studio` que persiste.

## 2. Prueba gratuita en el registro

- [x] 2.1 `createSignupSubscription` crea la suscripción en `trialing` con `trialEndsAt = now + trialDays` y `endDate = trialEndsAt`; verificar con un registro local que el estado y las fechas son correctos en `prisma studio`.
- [x] 2.2 Crear el primer pago `pending` con `dueDate = trialEndsAt` y monto/moneda del plan, sin usar `generateSubscriptionPayments`; verificar que el pago aparece con el vencimiento al día 7.
- [x] 2.3 Ajustar la bienvenida para informar días de prueba, monto y fecha de cobro, y asegurar que no se envía cobro inmediato en el registro; verificar el contenido del correo (o su registro en `emailLogs`).
- [x] 2.4 Confirmar que plan, streams y cuotas se aplican de inmediato en la prueba; verificar en el dashboard del cliente recién registrado que ve su plan activo.

## 3. Conversión de la prueba al confirmar el pago

- [x] 3.1 Ajustar `completePaymentAndGenerateNext` para aceptar `trialing` como estado de partida y fijar `endDate = fecha de cobro + intervalo`; verificar confirmando el pago de un trial local y comprobando la suscripción `active` y su nueva fecha de fin.
- [x] 3.2 Verificar que tras confirmar se elimina el pendiente anterior y se crea el siguiente pago del ciclo; comprobar en `prisma studio` o en `/dashboard/payments`.
- [x] 3.3 Verificar que el flujo de un pago posterior (segundo ciclo) mantiene el comportamiento actual; probar confirmar un segundo pago y validar que no hay regresión.

## 4. Vencimiento y visibilidad del estado de prueba

- [x] 4.1 Agregar el label `trial` en `lib/payment-status.ts` para suscripciones `trialing` vigentes, con días restantes; verificar con pruebas manuales de fechas (día 0, día 6, día 8).
- [x] 4.2 Derivar el estado "vencido" cuando `trialEndsAt < now` sin pago confirmado, sin marcar `expired` en base de datos ni ejecutar acciones; verificar que no existe ningún código que detenga streams por trial.
- [x] 4.3 Mostrar en `PaymentStatusCard` el estado "Prueba gratis · N días"; verificar en el dashboard de un cliente en prueba.
- [x] 4.4 Agregar badge y filtro "En prueba" en `ClientesTable`/`ClienteRow`; verificar que la lista y el filtro incluyen a los clientes con prueba vigente y excluyen vencidos.

## 5. Comunicación pública del trial

- [x] 5.1 Mostrar los 7 días gratis en `SignupForm`, `/planes/[slug]` y `/registro`; verificar el texto renderizado y que el mensaje de éxito menciona la prueba y la fecha de cobro.
- [x] 5.2 Verificar que la selección del plan en `/planes/[slug]` activa ese plan en prueba (no otro); registrar desde un plan fijo y comprobar `client.planId` y la suscripción.

## 6. Integración

- [x] 6.1 Ejecutar `npm run lint && npx tsc --noEmit` y `npm run build` sin errores.
- [x] 6.2 Registro end-to-end en local con plan de radio: verificar `trialing`, plan activo, streams, pago al día 7 y correos.
- [x] 6.3 Confirmar el pago desde `/admin` y verificar `active`, fecha de fin y siguiente pago; verificar que el dashboard deja de mostrar "Prueba gratis".
- [x] 6.4 Confirmar que el change no toca streaming-agent ni nodos: no requiere "Actualizar nodo" tras el deploy.
