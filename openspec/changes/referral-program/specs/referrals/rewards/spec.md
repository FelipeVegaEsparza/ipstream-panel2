# Spec Delta

## Purpose

Define la regla de acumulación 2→1, el valor histórico e inmutable de cada recompensa y el crédito que cubre automáticamente futuras renovaciones sin alterar precios ni el funcionamiento normal de la facturación.

## ADDED Requirements

### Requirement: Regla dos referidos válidos por un mes gratis

El sistema SHALL generar una recompensa de un mes gratis por cada grupo completo de dos referidos válidos del mismo referente. Los referidos válidos SHALL acumularse de forma permanente: el progreso hacia la siguiente recompensa es el resto de la división entera entre referidos válidos y dos.

#### Scenario: Un referido válido

- **WHEN** el referente tiene un referido válido
- **THEN** no se genera recompensa
- **AND** el progreso es 1 de 2

#### Scenario: Dos referidos válidos

- **WHEN** el referente alcanza dos referidos válidos
- **THEN** se genera exactamente una recompensa de un mes
- **AND** el progreso vuelve a 0 de 2

#### Scenario: Tres referidos válidos

- **WHEN** el referente tiene tres referidos válidos
- **THEN** se mantiene una recompensa generada
- **AND** el progreso es 1 de 2

#### Scenario: Cuatro referidos válidos

- **WHEN** el referente tiene cuatro referidos válidos
- **THEN** existen exactamente dos recompensas generadas
- **AND** el progreso es 0 de 2

#### Scenario: Referidos acumulados sin límite

- **WHEN** el referente acumula diez o más referidos válidos
- **THEN** recibe una recompensa por cada grupo completo de dos
- **AND** conserva el progreso restante

### Requirement: Valor histórico de la recompensa

El valor de cada recompensa SHALL ser equivalente a una mensualidad del menor precio entre el plan del cliente referente y el plan del cliente referido que originó la recompensa, calculado en el momento en que el referido completa su segundo pago. El importe y la moneda SHALL quedar congelados como valor histórico e inmutable.

#### Scenario: Planes con el mismo precio

- **WHEN** ambos planes tienen la misma mensualidad
- **THEN** la recompensa equivale a esa mensualidad

#### Scenario: Planes con precios distintos

- **WHEN** el plan del referente y el del referido tienen precios mensuales distintos
- **THEN** la recompensa usa el menor de los dos
- **AND** registra el precio de ambos planes como referencia histórica

#### Scenario: Plan anual

- **WHEN** uno de los planes es anual
- **THEN** su precio se normaliza dividiéndolo por los meses del período anual
- **AND** la comparación se hace en términos mensuales

#### Scenario: Monedas distintas

- **WHEN** los planes están expresados en monedas distintas
- **THEN** el sistema convierte los importes con la tasa configurada por el administrador
- **AND** emite la recompensa en la moneda de facturación del referente
- **AND** guarda la tasa utilizada junto con la recompensa

#### Scenario: Cambio posterior de precios

- **WHEN** el administrador modifica el precio de un plan después de generada una recompensa
- **THEN** las recompensas ya generadas conservan su importe original
- **AND** solo las nuevas recompensas usan los precios vigentes

#### Scenario: Precio no disponible

- **WHEN** alguno de los planes no tiene precio utilizable para la moneda de emisión
- **THEN** el sistema usa el precio base del plan como respaldo
- **AND** deja registro de la fuente usada para el cálculo

### Requirement: Registro individual de recompensas

El sistema SHALL registrar cada recompensa con identificador, cliente beneficiario, referido de origen, fecha de generación, cantidad de meses, importe, moneda, estado, fecha de utilización y suscripción a la que se aplicó. Los estados permitidos SHALL ser `available`, `applied`, `expired` y `voided`.

#### Scenario: Recompensa generada

- **WHEN** se completa un grupo de dos referidos válidos
- **THEN** se crea una recompensa `available` con su importe histórico
- **AND** se registra el referido que completó el grupo

#### Scenario: Recompensa aplicada

- **WHEN** el crédito de la recompensa se consume por completo
- **THEN** la recompensa pasa a `applied`
- **AND** se guarda la fecha de utilización y la suscripción beneficiaria

#### Scenario: Recompensa parcialmente utilizada

- **WHEN** el crédito cubre solo una parte de un pago
- **THEN** la recompensa conserva el saldo restante disponible
- **AND** registra la aplicación parcial sin marcarla como agotada

#### Scenario: Recompensa anulada

- **WHEN** el administrador anula una recompensa con justificación
- **THEN** la recompensa pasa a `voided`
- **AND** su crédito deja de estar disponible

### Requirement: Generación idempotente y transaccional

La generación de recompensas SHALL ejecutarse en una transacción de base de datos y SHALL ser idempotente. Cada grupo de dos referidos válidos SHALL corresponder a un único slot de recompensa por referente, de modo que reintentos o ejecuciones concurrentes no dupliquen premios.

#### Scenario: Proceso ejecutado dos veces

- **WHEN** el proceso de recompensas corre dos veces sobre el mismo conjunto de referidos válidos
- **THEN** solo existe una recompensa por slot
- **AND** la segunda ejecución no modifica importes ni estados

#### Scenario: Validaciones concurrentes

- **WHEN** dos referidos alcanzan la validez al mismo tiempo y completan el mismo grupo
- **THEN** la base de datos impide crear dos recompensas para el mismo slot
- **AND** el sistema resuelve la operación sin error visible para el cliente

### Requirement: Aplicación automática del crédito

El sistema SHALL aplicar automáticamente el crédito de las recompensas disponibles a las futuras renovaciones del cliente beneficiario. El crédito no SHALL aplicarse sobre períodos ya pagados, no SHALL convertirse en dinero y no SHALL transferirse a otras cuentas ni retirarse.

#### Scenario: Crédito cubre la renovación completa

- **WHEN** el cliente tiene crédito suficiente para cubrir el importe de su próxima renovación impaga
- **THEN** el sistema aplica el crédito al pago
- **AND** el pago queda cubierto sin generar un cargo al cliente
- **AND** la renovación y la suscripción avanzan normalmente

#### Scenario: Crédito cubre parte de la renovación

- **WHEN** el crédito disponible es menor al importe de la renovación
- **THEN** el sistema aplica todo el crédito disponible
- **AND** el cliente solo adeuda la diferencia
- **AND** registra la aplicación parcial

#### Scenario: Varios meses acumulados

- **WHEN** el cliente tiene crédito para más de una renovación
- **THEN** el sistema aplica el crédito en renovaciones consecutivas
- **AND** mantiene el saldo restante disponible para la siguiente

#### Scenario: Período ya pagado

- **WHEN** un pago ya está confirmado o pertenece a un período anterior a la generación de la recompensa
- **THEN** el crédito no se aplica sobre ese pago
- **AND** queda disponible para la siguiente renovación

#### Scenario: Intento de retiro o transferencia

- **WHEN** el cliente solicita convertir el crédito en dinero, transferirlo o retirarlo
- **THEN** el sistema no ofrece ni permite esa operación

### Requirement: Compatibilidad con la facturación existente

La aplicación de crédito SHALL conservar el importe original de los pagos, los precios de los planes y las reglas actuales de renovación y suspensión. El crédito aplicado SHALL exponerse como un valor adicional del pago, sin reescribir el historial de facturación.

#### Scenario: Pago con crédito aplicado

- **WHEN** un pago recibe crédito de referidos
- **THEN** el pago conserva su importe original y registra el crédito aplicado
- **AND** el saldo exigible corresponde a la diferencia
- **AND** el historial muestra el pago como cubierto o parcialmente cubierto

#### Scenario: Recompensa generada sin pago pendiente

- **WHEN** el cliente recibe una recompensa pero no tiene pagos futuros pendientes
- **THEN** el crédito queda disponible
- **AND** se aplica en la siguiente renovación que corresponda

#### Scenario: Cliente sin suscripción activa

- **WHEN** un cliente con recompensas disponibles no tiene suscripción activa
- **THEN** el crédito se conserva
- **AND** no se aplica ni se pierde hasta que exista una renovación válida
