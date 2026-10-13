# Spec Delta

## Purpose

Define cómo el proceso Node del panel resuelve trabajo repetitivo (permisos de menú, sesión/cliente) y hashing de contraseñas de forma eficiente y sin bloquear el event loop, de modo que el panel sostenga más usuarios concurrentes sin degradar o congelarse.

## ADDED Requirements

### Requirement: Caché de permisos de menú por cliente
El sistema SHALL resolver los items de menú ocultos/habilitados de un cliente usando una caché en proceso con TTL corto (máximo 60 segundos), de modo que requests repetidos dentro del TTL no consulten la base de datos.

#### Scenario: Requests repetidos dentro del TTL no consultan la base de datos
- **WHEN** se repite una request autenticada que evalúa permisos de menú para el mismo cliente dentro del TTL
- **THEN** el sistema resuelve el permiso desde la caché sin ejecutar consultas adicionales de menú

#### Scenario: Cambio global de menú invalida la caché
- **WHEN** un administrador modifica qué items están ocultos globalmente
- **THEN** la siguiente request refleja el cambio sin esperar el vencimiento del TTL

#### Scenario: Override de menú de un cliente invalida su caché
- **WHEN** un administrador habilita o deshabilita un item de menú para un cliente específico
- **THEN** la siguiente request de ese cliente refleja el cambio sin esperar el vencimiento del TTL

### Requirement: Deduplicación de sesión y cliente efectivo por request
El sistema SHALL resolver la sesión del usuario y el cliente efectivo (incluyendo impersonación) una sola vez por request, reutilizando el resultado en cualquier evaluación posterior dentro del mismo request.

#### Scenario: Múltiples evaluaciones en una request
- **WHEN** una misma request autenticada evalúa la sesión o el cliente efectivo más de una vez
- **THEN** el sistema reutiliza el resultado ya resuelto en lugar de volver a verificar el token o leer las cookies

#### Scenario: Request no autenticada
- **WHEN** llega una request sin sesión válida
- **THEN** el sistema responde con el estado no autorizado correspondiente, sin arrojar error

### Requirement: Hashing de contraseña no bloqueante
El sistema SHALL verificar y generar hashes de contraseña con una implementación asíncrona que no bloquee el event loop principal del panel, y SHALL usar un cost de 10 para los hashes nuevos.

#### Scenario: Ráfaga de logins no congela el panel
- **WHEN** múltiples usuarios inician sesión de forma concurrente
- **THEN** el resto de las requests del panel continúan respondiendo (no hay pausas prolongadas del servidor)

#### Scenario: Hashes existentes siguen siendo válidos
- **WHEN** un usuario con una contraseña hasheada previamente (cost distinto) inicia sesión con la contraseña correcta
- **THEN** el sistema valida el hash existente y permite el acceso

#### Scenario: Contraseña incorrecta es rechazada
- **WHEN** un usuario intenta iniciar sesión con una contraseña incorrecta
- **THEN** el sistema rechaza el login sin revelar si el email existe
