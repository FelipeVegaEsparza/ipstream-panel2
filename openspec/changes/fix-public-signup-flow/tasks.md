# Tasks

## 1. Estado de suscripción unificado

- [x] 1.1 Crear una constante única para el estado activo de suscripción (p. ej. `ACTIVE_SUBSCRIPTION_STATUS = 'active'` en `lib/subscription-status.ts`) y reemplazar los literales dispersos; verificar con `grep -rn "'ACTIVE'" app lib` que no quede ningún uso en mayúsculas ni literales sueltos en dashboard, admin, `signup.ts`, `payment-generator.ts` y `account-pdf.ts`.
- [x] 1.2 Corregir la consulta del dashboard (`app/dashboard/page.tsx:65`) para usar la constante en minúsculas; verificar que un cliente con suscripción activa ve su plan y próximo pago, y no "Sin Plan Activo".
- [x] 1.3 Verificar la coherencia dashboard/admin: con un cliente activo, el dashboard muestra su plan y `/admin/users` reporta el mismo estado; correr `npm run lint && npx tsc --noEmit`.

## 2. Registro atómico y validación del plan

- [x] 2.1 Refactorizar `createSignupSubscription` para operar con un cliente transaccional o inlinearlo en la ruta, de modo que `User`+`Client`+`Subscription`+`Payment`+cuotas y las filas de streams se creen dentro de un único `prisma.$transaction`; verificar con `npx tsc --noEmit` y un registro local exitoso.
- [x] 2.2 Validar dentro de la transacción que el `planId` existe y está activo, abortando con 400 si no; verificar enviando un `planId` inválido con `curl` y comprobando que no se crea usuario, cliente, suscripción ni pago.
- [x] 2.3 Mantener las llamadas al agente de streaming (seed del AutoDJ) fuera de la transacción, tras el commit; verificar en el código que no hay ninguna llamada a `streamingClient` dentro del bloque transaccional.
- [x] 2.4 Probar el camino de fallo: forzar un error después de crear la cuenta (p. ej. plan inactivo) y verificar en la base de datos que no queda ningún registro parcial.

## 3. Límite de tasa fiable

- [x] 3.1 Corregir la derivación de IP en la ruta de registro para usar el último salto de confianza de `x-forwarded-for` (y `x-real-ip` como respaldo); verificar con dos peticiones `curl` que añaden un `X-Forwarded-For` falso y comprobar que comparten el mismo cupo.
- [x] 3.2 Documentar el alcance del límite (por instancia, se reinicia con el proceso) en el diseño/comentario del módulo; verificar que el comentario refleja el comportamiento real.
- [x] 3.3 Verificar el límite de 5 registros/hora: enviar peticiones sucesivas con la misma IP y comprobar que la sexta responde 429.

## 4. Seed del AutoDJ observable

- [x] 4.1 Propagar el resultado (`{ ok, error }`) de `seedDefaultAutoDjContent` desde la ruta de registro hasta `notifyAdminNewSignup`, e incluir en el correo al admin si el seed falló y por qué; verificar forzando un fallo del agente y revisando el correo/log.
- [x] 4.2 Asegurar que un fallo del seed no revierte el registro ni suscribe errores al cliente; verificar que el registro responde éxito aunque el agente esté caído.

## 5. Verificación de integración

- [x] 5.1 Ejecutar `npm run lint && npx tsc --noEmit` y `npm run build` sin errores.
- [x] 5.2 Registro end-to-end en local desde `/registro` con plan de radio: verificar cuenta+cliente+stream y el estado de suscripción/pago definido por `free-trial`.
- [x] 5.3 Verificar que un `planId` inválido no crea cuenta y que el registro con plan válido asigna exactamente ese plan.
- [x] 5.4 Confirmar que el change no toca streaming-agent ni nodos: no hace falta "Actualizar nodo" tras el deploy.
