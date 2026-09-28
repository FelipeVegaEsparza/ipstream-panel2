## Purpose

Coherencia de los estados de suscripción y del estado inicial de los pagos según el origen del alta: dashboard y administración reconocen el mismo valor de estado activo, y el primer pago refleja si la suscripción la creó el cliente desde el registro público o el administrador.

## ADDED Requirements

### Requirement: El estado de la suscripción se lee con el mismo valor que se escribe

El sistema SHALL usar un único valor de estado para las suscripciones activas en todas las consultas y comparaciones, de modo que una suscripción activa sea reconocida como activa por el dashboard del cliente y por el panel de administración.

#### Scenario: Cliente activo ve su plan

- **WHEN** un cliente con suscripción activa abre el dashboard
- **THEN** ve su plan y su próximo pago, no un estado de "sin plan activo"

#### Scenario: Coherencia entre dashboard y admin

- **WHEN** el administrador lista los clientes
- **THEN** el estado de suscripción que ve coincide con el que muestra el dashboard del cliente

### Requirement: El estado inicial del pago depende del origen del alta

El sistema SHALL registrar el primer pago como pendiente (a cobrar) cuando la suscripción proviene del registro público, y como confirmado cuando el plan es asignado por un administrador.

#### Scenario: Registro público deja un pago pendiente

- **WHEN** se crea una suscripción desde el registro público
- **THEN** su primer pago queda pendiente, con su fecha de vencimiento

#### Scenario: Asignación por administrador deja el pago confirmado

- **WHEN** el administrador asigna un plan a un cliente existente
- **THEN** el primer pago de la suscripción queda confirmado
