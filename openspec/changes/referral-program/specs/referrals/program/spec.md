# Spec Delta

## Purpose

Define quién puede recomendar, cómo se identifica a cada referente con un código único y permanente, y las reglas generales del programa de referidos de CasterFly.

## ADDED Requirements

### Requirement: Elegibilidad del referente

El sistema SHALL permitir participar en el programa únicamente a clientes cuya cuenta esté activa y que tengan al menos una mensualidad pagada y confirmada. Un cliente sin pago confirmado SHALL ver el programa en estado no elegible, con los requisitos pendientes, y no SHALL poder generar atribuciones.

#### Scenario: Cliente elegible

- **WHEN** el cliente tiene su cuenta activa y al menos un pago con estado `completed`, importe mayor a cero y no cubierto por crédito de referidos
- **THEN** el sistema lo marca como elegible
- **AND** muestra su código y enlace de referido

#### Scenario: Cliente sin primera mensualidad

- **WHEN** el cliente no tiene ningún pago confirmado que cumpla las condiciones
- **THEN** el sistema lo marca como no elegible
- **AND** no permite atribuir nuevos referidos a su código
- **AND** explica que debe pagar su primera mensualidad para participar

#### Scenario: Cuenta inactiva

- **WHEN** el usuario del cliente está inactivo o su suscripción no está activa
- **THEN** el sistema no considera elegible al cliente para nuevas atribuciones
- **AND** conserva intactos los referidos y recompensas ya registrados

### Requirement: Código de referido único y permanente

El sistema SHALL generar automáticamente un código de referido por cliente, único en toda la plataforma, permanente y asociado al identificador del cliente. El código SHALL seguir el formato `CAST-` seguido de un sufijo derivado del nombre y un componente aleatorio, y no SHALL reutilizarse aunque el cliente cambie de nombre, plan o estado.

#### Scenario: Generación automática

- **WHEN** un cliente elegible accede al programa por primera vez y aún no tiene código
- **THEN** el sistema genera un código único, lo persiste y lo devuelve
- **AND** el código queda asociado permanentemente a ese cliente

#### Scenario: Generación idempotente

- **WHEN** el cliente vuelve a acceder o se ejecutan procesos concurrentes
- **THEN** el sistema devuelve el mismo código ya generado
- **AND** no crea un segundo código para el mismo cliente

#### Scenario: Colisión de código

- **WHEN** el sufijo generado ya está en uso por otro cliente
- **THEN** el sistema genera un sufijo alternativo
- **AND** no expone ni asigna un código duplicado

#### Scenario: Código no reutilizable

- **WHEN** un código ya fue asignado a un cliente
- **THEN** ningún otro cliente puede recibirlo, ni siquiera si el primero deja de ser elegible

### Requirement: Enlace personal de invitación

El sistema SHALL construir el enlace de invitación del cliente a partir del dominio público configurado de la plataforma y de su código, con la forma `https://<dominio-público>/registro?ref=<código>`.

#### Scenario: Enlace con dominio configurado

- **WHEN** el panel tiene configurado el dominio público del sitio
- **THEN** el enlace usa ese dominio y el código del cliente
- **AND** el enlace es estable entre sesiones

#### Scenario: Dominio no configurado

- **WHEN** no hay dominio público configurado
- **THEN** el sistema usa el origen de la petición como base del enlace
- **AND** no genera un enlace con dominio vacío o inválido

### Requirement: Reglas generales de acumulación

El sistema SHALL permitir una cantidad ilimitada de referidos por cliente y una cantidad ilimitada de recompensas acumuladas. Cada referido válido SHALL contar una sola vez y los referidos válidos SHALL acumularse entre ciclos de recompensa.

#### Scenario: Sin límite de referidos

- **WHEN** un cliente acumula más referidos de los necesarios para varias recompensas
- **THEN** el sistema sigue aceptando y validando nuevos referidos
- **AND** no bloquea la participación por cantidad

#### Scenario: Acumulación entre ciclos

- **WHEN** un cliente tiene tres referidos válidos
- **THEN** conserva el progreso de un referido hacia la siguiente recompensa
- **AND** no reinicia el conteo a cero
