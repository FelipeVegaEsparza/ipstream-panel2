## Purpose

Define la configuración de la zona horaria por cliente y su uso para interpretar la parrilla horaria de radio y televisión, de modo que cada canal evalúe las franjas en su propia hora local.

## ADDED Requirements

### Requirement: El cliente tiene una zona horaria configurada
El sistema SHALL almacenar una zona horaria por cliente, expresada en identificador IANA (ej. `America/Santiago`, `America/Mexico_City`), con valor por defecto `UTC`. El cliente SHALL poder verla y modificarla desde el panel.

#### Scenario: Cliente nuevo con zona por defecto
- **WHEN** se crea un cliente sin especificar zona horaria
- **THEN** la zona horaria queda en `UTC`

#### Scenario: El cliente configura su zona horaria
- **WHEN** el cliente guarda un identificador IANA válido desde el panel
- **THEN** el sistema persiste la nueva zona horaria
- **AND** el sistema la usa para evaluar la parrilla

#### Scenario: Zona horaria inválida
- **WHEN** el cliente intenta guardar una zona que no es un identificador IANA válido
- **THEN** el sistema rechaza el valor y mantiene la zona anterior

### Requirement: La parrilla horaria se evalúa en la zona del cliente
El sistema SHALL determinar la franja vigente ("ahora") en la zona horaria del cliente, tanto para radio como para televisión. Una franja configurada como `08:00` SHALL significar las 08:00 en la zona del cliente, incluyendo el día de la semana correspondiente a esa zona.

#### Scenario: Franja evaluada en zona del cliente
- **WHEN** el cliente tiene zona `America/Santiago` y una franja activa `08:00-09:00`
- **THEN** el sistema la considera vigente cuando son las 08:00 en Santiago
- **AND** no la considera vigente cuando son las 08:00 UTC pero aún no las 08:00 en Santiago

#### Scenario: Día de la semana según zona
- **WHEN** el momento en la zona del cliente corresponde a un día distinto que en UTC
- **THEN** el sistema usa el día de la semana de la zona del cliente para resolver la franja

#### Scenario: Cambio de hora (DST)
- **WHEN** la zona del cliente tiene horario de verano/invierno
- **THEN** el sistema resuelve la franja según el reloj local de la zona en cada momento, sin requerir reconfiguración

### Requirement: La interfaz de parrilla indica la zona horaria
El sistema SHALL mostrar en la interfaz de parrilla (radio y TV) la zona horaria del cliente, para que las horas mostradas se entiendan como hora local del canal.

#### Scenario: La parrilla muestra la zona
- **WHEN** un cliente abre la sección de parrilla
- **THEN** la interfaz muestra las franjas con su hora local y la zona horaria configurada del cliente

#### Scenario: Cambio de zona con franjas existentes
- **WHEN** el cliente cambia su zona horaria teniendo franjas ya creadas
- **THEN** las horas de las franjas se reinterpretan en la nueva zona
- **AND** el sistema lo informa como un cambio potencial de horarios vigentes
