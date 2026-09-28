## Purpose

Período de prueba gratuito en el registro público de IPStream: el plan elegido se activa de inmediato en modo prueba por 7 días configurables, el primer cobro se programa al finalizar la prueba y se convierte en suscripción activa al confirmarse el pago, mostrando el estado de prueba al cliente y al administrador.

## ADDED Requirements

### Requirement: El registro público inicia una prueba gratuita con el plan elegido activo

El sistema SHALL crear, al completar el registro público con un plan activo, una suscripción en estado de prueba (`trialing`) cuyo fin de prueba SHALL ser la fecha de registro más la duración configurada en `AppConfig.trialDays` (7 días por defecto). El plan elegido, sus streams y sus cuotas SHALL quedar activos de inmediato, sin esperar la confirmación de un pago ni una acción del administrador.

#### Scenario: Registro con plan inicia la prueba

- **WHEN** un visitante completa el registro público eligiendo un plan activo
- **THEN** el sistema crea la suscripción en estado de prueba con fin de prueba a N días (N = `AppConfig.trialDays`)
- **AND** el plan elegido queda asignado al cliente y sus streams y cuotas quedan activos
- **AND** el dashboard del cliente muestra su plan activo en prueba

#### Scenario: Duración configurable

- **WHEN** el administrador configura `trialDays` con un valor distinto de 7
- **THEN** los registros posteriores calculan su fin de prueba con ese valor

#### Scenario: Registro sin plan

- **WHEN** el visitante completa el registro público sin elegir plan
- **THEN** el sistema no crea suscripción ni prueba

### Requirement: El primer cobro se programa al finalizar la prueba

El sistema SHALL crear, junto con la prueba, el primer pago en estado pendiente cuyo vencimiento SHALL ser la fecha de fin de la prueba y cuyo monto y moneda SHALL corresponder al plan elegido. El correo de bienvenida SHALL informar el monto y la fecha de cobro; el registro NO SHALL enviar un cobro inmediato.

#### Scenario: Pago diferido al fin de la prueba

- **WHEN** se inicia una prueba para un plan
- **THEN** el primer pago queda pendiente con vencimiento igual al fin de la prueba
- **AND** el monto y la moneda coinciden con el precio del plan

#### Scenario: Bienvenida informa el cobro

- **WHEN** se envía el correo de bienvenida de un registro en prueba
- **THEN** el correo indica los días de prueba, el monto y la fecha en que se cobrará el primer período

### Requirement: La confirmación del primer pago convierte la prueba en suscripción activa

El sistema SHALL cambiar la suscripción de prueba a activa cuando el administrador confirma el primer pago pendiente. La fecha de fin de la suscripción SHALL quedar en la fecha de cobro más el intervalo del plan, y SHALL generarse el siguiente pago pendiente del ciclo.

#### Scenario: Confirmar el pago de la prueba

- **WHEN** el administrador confirma el pago pendiente de una suscripción en prueba
- **THEN** la suscripción pasa a estado activo
- **AND** su fecha de fin se extiende por el intervalo del plan desde la fecha de cobro
- **AND** se crea el siguiente pago pendiente del ciclo

#### Scenario: Segundo ciclo

- **WHEN** el administrador confirma un pago de un período ya activo
- **THEN** el sistema avanza la suscripción al siguiente ciclo igual que hoy (sin cambio de comportamiento)

### Requirement: La prueba vencida sin pago no suspende el servicio automáticamente

El sistema SHALL considerar vencida una suscripción en prueba cuyo fin de prueba haya pasado sin un pago confirmado, y SHALL mostrarla como vencida en el dashboard del cliente y en el panel de administración. El sistema NO SHALL detener streams, cortar el sitio público ni bloquear el acceso al panel de forma automática al vencer la prueba.

#### Scenario: Prueba vencida visible

- **WHEN** pasa la fecha de fin de la prueba y no hay pago confirmado
- **THEN** la suscripción se muestra como vencida para el cliente y para el administrador

#### Scenario: Sin suspensión automática

- **WHEN** una prueba vence
- **THEN** el sistema no detiene los streams ni bloquea el acceso al dashboard
- **AND** el administrador decide manualmente cómo proceder

### Requirement: El estado de prueba es visible para el cliente y el administrador

El sistema SHALL mostrar en el dashboard del cliente el estado "Prueba gratis" con los días restantes de prueba, y en el panel de administración un badge y un filtro de "En prueba" que incluya a los clientes con prueba vigente.

#### Scenario: Dashboard del cliente en prueba

- **WHEN** un cliente con prueba vigente abre su dashboard
- **THEN** ve el estado "Prueba gratis" y los días restantes, no un estado de pago al día ni de plan inactivo

#### Scenario: Admin identifica clientes en prueba

- **WHEN** el administrador abre la lista de clientes
- **THEN** los clientes en prueba muestran un badge "En prueba" y pueden filtrarse por ese estado
