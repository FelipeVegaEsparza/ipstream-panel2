# Spec Delta

## Purpose

Define la sección del dashboard donde cada cliente consulta su código, su enlace, el progreso de sus referidos y sus recompensas, sin acceder a datos de otros clientes ni a información financiera de terceros.

## ADDED Requirements

### Requirement: Acceso a la sección Programa de Referidos

El sistema SHALL exponer una sección **Programa de Referidos** en el menú principal del dashboard del cliente, navegable solo por usuarios autenticados con rol de cliente. La sección SHALL respetar la configuración de menú del cliente y SHALL redirigir a la página principal si el ítem está deshabilitado.

#### Scenario: Cliente autenticado

- **WHEN** un cliente con sesión abre el menú principal del dashboard
- **THEN** ve la entrada "Programa de Referidos"
- **AND** puede abrir la sección

#### Scenario: Ítem deshabilitado

- **WHEN** el cliente tiene ese ítem deshabilitado en la configuración de su menú
- **THEN** el sistema redirige a `/dashboard`
- **AND** no muestra datos del programa

#### Scenario: Usuario sin sesión

- **WHEN** una petición no autenticada intenta acceder a la sección o a su API
- **THEN** el sistema responde con redirección al login o error de no autorizado

### Requirement: Resumen de recompensas

La sección SHALL mostrar el total de clientes referidos, los referidos válidos, los referidos pendientes, los meses gratis acumulados, los disponibles y los utilizados, además del progreso hacia la siguiente recompensa.

#### Scenario: Cliente con historial

- **WHEN** el cliente tiene referidos y recompensas
- **THEN** ve los conteos actualizados de cada categoría
- **AND** los meses acumulados equivalen a todas las recompensas no anuladas
- **AND** los disponibles y utilizados reflejan el saldo real

#### Scenario: Cliente sin actividad

- **WHEN** el cliente aún no tiene referidos
- **THEN** ve ceros y el progreso 0 de 2
- **AND** se le invita a compartir su enlace

### Requirement: Enlace personal con copiar y compartir

La sección SHALL mostrar el enlace de referido del cliente con una acción para copiarlo y otra para compartirlo, y SHALL informar el resultado de la acción.

#### Scenario: Copiar enlace

- **WHEN** el cliente pulsa copiar
- **THEN** el enlace completo se copia al portapapeles
- **AND** recibe una confirmación visible

#### Scenario: Compartir enlace

- **WHEN** el cliente pulsa compartir y el navegador soporta la Web Share API
- **THEN** se abre el diálogo nativo de compartir con el enlace
- **AND** si no la soporta, el sistema ofrece copiar el enlace como alternativa

### Requirement: Indicador visual de progreso

La sección SHALL mostrar visualmente cuántos referidos válidos faltan para la siguiente recompensa y SHALL usar el texto del progreso acumulado real.

#### Scenario: Progreso 1 de 2

- **WHEN** el cliente tiene un referido válido
- **THEN** ve "1 de 2 referidos válidos" y el aviso de que falta un cliente nuevo para su próximo mes gratis

#### Scenario: Progreso 0 de 2 tras recompensa

- **WHEN** el cliente acaba de completar dos referidos válidos
- **THEN** el progreso vuelve a 0 de 2
- **AND** la recompensa recién generada aparece en el historial

### Requirement: Historial de referidos

La sección SHALL mostrar una tabla con el nombre del cliente referido, la fecha de registro, el plan contratado, el estado del referido, el progreso de pagos y la fecha de validación. La tabla no SHALL exponer montos, medios de pago, comprobantes ni otros datos financieros de los referidos.

#### Scenario: Referido pendiente

- **WHEN** un referido aún no completó sus dos pagos
- **THEN** la tabla muestra su estado y el progreso de pagos
- **AND** no muestra datos financieros

#### Scenario: Referido validado

- **WHEN** un referido completó sus dos pagos
- **THEN** la tabla muestra el estado validado y la fecha de validación

#### Scenario: Aislamiento de datos

- **WHEN** el cliente consulta su historial
- **THEN** solo ve los referidos asociados a su propio código
- **AND** no puede acceder a referidos de otros clientes

### Requirement: Historial de recompensas

La sección SHALL mostrar la fecha de obtención, la cantidad de meses, el valor del crédito, el estado y la fecha de aplicación de cada recompensa.

#### Scenario: Recompensa disponible

- **WHEN** el cliente tiene una recompensa sin usar
- **THEN** ve su fecha, meses, valor y estado disponible

#### Scenario: Recompensa utilizada

- **WHEN** la recompensa fue aplicada a una renovación
- **THEN** ve la fecha de aplicación y el estado aplicado

#### Scenario: Recompensa anulada

- **WHEN** la recompensa fue anulada por el administrador
- **THEN** ve el estado anulado
- **AND** no se muestra como crédito disponible

### Requirement: Estado no elegible

La sección SHALL mostrar el programa en estado no elegible cuando el cliente aún no cumple los requisitos, con una explicación clara y sin permitir el uso activo del enlace.

#### Scenario: Primera mensualidad pendiente

- **WHEN** el cliente no tiene una mensualidad pagada
- **THEN** ve un aviso de que debe activar y pagar su primera mensualidad
- **AND** el enlace de referido no se ofrece como activo

#### Scenario: Cliente existente que cumple los requisitos

- **WHEN** un cliente antiguo entra por primera vez y ya tiene pagos confirmados
- **THEN** el sistema genera su código en ese momento
- **AND** puede participar sin perder sus datos ni su suscripción

### Requirement: API del dashboard acotada al cliente

La API del programa SHALL devolver únicamente la información del cliente autenticado y SHALL derivar el cliente de la sesión, no de identificadores enviados por el navegador.

#### Scenario: Petición de otro cliente

- **WHEN** una petición intenta consultar el programa de otro cliente manipulando un identificador
- **THEN** el sistema ignora el identificador
- **AND** devuelve solo los datos del cliente autenticado

#### Scenario: Respuesta sin datos sensibles

- **WHEN** la API responde al dashboard
- **THEN** no incluye emails, IPs, identificadores de pago ni montos de los referidos
