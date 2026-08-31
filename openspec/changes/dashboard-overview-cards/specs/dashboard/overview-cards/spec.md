## Purpose

Resumen del dashboard del cliente con cards de oyentes en vivo (radio y TV), almacenamiento usado/disponible según el plan, y el plan contratado, presentadas al inicio de la página.

## ADDED Requirements

### Requirement: El dashboard muestra cards de resumen al inicio
El sistema SHALL mostrar, en la página principal del dashboard del cliente (`/dashboard`), tres cards de resumen antes de la sección de reproducción (NowPlaying): oyentes en vivo, almacenamiento usado/disponible, y plan contratado.

#### Scenario: El cliente abre su dashboard
- **WHEN** un cliente abre `/dashboard`
- **THEN** ve tres cards de resumen al inicio, antes del reproductor actual/el próximo tema

### Requirement: Card de oyentes en vivo (radio y TV)
El sistema SHALL mostrar en una card los oyentes en vivo de la radio y los espectadores en vivo de la televisión del cliente. La televisión SHALL mostrarse solo si el plan del cliente la incluye.

#### Scenario: Plan con radio y TV
- **WHEN** el plan del cliente incluye radio y TV
- **THEN** la card muestra oyentes de radio y espectadores de TV en vivo

#### Scenario: Plan solo radio
- **WHEN** el plan del cliente incluye solo radio
- **THEN** la card muestra solo los oyentes de radio

#### Scenario: Sin transmisión en vivo
- **WHEN** la radio o la TV del cliente no están transmitiendo
- **THEN** el valor correspondiente se muestra en 0 (o "—") sin romper la card

### Requirement: Card de almacenamiento según el plan
El sistema SHALL mostrar en una card el almacenamiento usado y el disponible según las cuotas del plan (radio y/o TV según lo que incluya el plan).

#### Scenario: Almacenamiento de radio
- **WHEN** el plan incluye radio
- **THEN** la card muestra el almacenamiento de radio usado vs. disponible (o "Ilimitado" si no hay cuota)

#### Scenario: Almacenamiento de TV
- **WHEN** el plan incluye TV
- **THEN** la card muestra el almacenamiento de video usado vs. disponible (o "Ilimitado" si no hay cuota)

### Requirement: Card del plan contratado
El sistema SHALL mostrar en una card el plan contratado del cliente: nombre, periodicidad (mensual/anual) y precio.

#### Scenario: Cliente con plan
- **WHEN** el cliente tiene un plan activo
- **THEN** la card muestra el nombre del plan, la periodicidad y el precio

#### Scenario: Cliente sin plan
- **WHEN** el cliente no tiene plan
- **THEN** la card lo indica (sin romper el dashboard)

### Requirement: La sección "Mi Plan" se elimina del dashboard principal
El sistema SHALL dejar de mostrar la tarjeta "Mi Plan" (`PlanServicesCard`) en la página principal del dashboard, reemplazada por la nueva card de plan de resumen.

#### Scenario: El dashboard no muestra la tarjeta antigua
- **WHEN** un cliente abre `/dashboard`
- **THEN** la tarjeta "Mi Plan" ya no se muestra
