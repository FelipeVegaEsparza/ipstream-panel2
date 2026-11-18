# Spec Delta

## Purpose

Define el panel administrativo del programa de referidos: indicadores globales, consulta y búsqueda de referentes y referidos, verificación de pagos, gestión de recompensas y auditoría de cada operación.

## ADDED Requirements

### Requirement: Acceso administrativo exclusivo

La sección administrativa de referidos y sus APIs SHALL estar disponibles únicamente para usuarios con rol `ADMIN`. Cualquier otro usuario SHALL recibir un error de no autorizado o una redirección.

#### Scenario: Administrador autenticado

- **WHEN** un usuario con rol administrador abre la sección
- **THEN** accede a los listados, indicadores y acciones

#### Scenario: Cliente autenticado

- **WHEN** un usuario con rol cliente intenta acceder a la API administrativa
- **THEN** el sistema responde 401 o 403
- **AND** no devuelve datos de otros clientes

### Requirement: Listado de referentes y referidos

El panel SHALL permitir consultar todos los clientes referentes con su código y métricas, y todos los clientes referidos con su estado, referente y fechas relevantes. La búsqueda SHALL aceptar nombre, email, código de referido y rango de fechas.

#### Scenario: Consulta de referentes

- **WHEN** el administrador abre el listado de referentes
- **THEN** ve cada cliente con código, referidos totales, válidos, pendientes y recompensas

#### Scenario: Búsqueda por código

- **WHEN** el administrador busca por un código de referido
- **THEN** el sistema devuelve el referente y sus referidos asociados

#### Scenario: Búsqueda por período

- **WHEN** el administrador filtra por rango de fechas
- **THEN** el listado incluye solo los referidos registrados o validados dentro del rango

#### Scenario: Búsqueda sin resultados

- **WHEN** ningún registro coincide con el criterio
- **THEN** el sistema muestra un estado vacío claro
- **AND** no devuelve datos de ejemplo

### Requirement: Detalle y verificación de un referido

El panel SHALL mostrar el detalle de cada referido con su estado, fechas y los pagos que respaldan la validación, incluyendo estado, fecha de pago y referencia de la transacción.

#### Scenario: Verificar los pagos de validación

- **WHEN** el administrador abre el detalle de un referido válido
- **THEN** ve los dos pagos confirmados que lo validaron
- **AND** puede distinguir pagos excluidos, como prueba, reembolso o crédito

#### Scenario: Referido pendiente

- **WHEN** el administrador abre un referido pendiente
- **THEN** ve qué condición falta para validarse
- **AND** ve el historial de pagos disponible

### Requirement: Indicadores generales

El panel SHALL mostrar el total de clientes captados por referidos, los referidos pendientes de validación, los referidos válidos, el total de meses gratuitos generados, el total de crédito otorgado y el total de crédito utilizado.

#### Scenario: Indicadores con actividad

- **WHEN** el administrador abre el panel con datos existentes
- **THEN** cada indicador refleja la suma correspondiente del período consultado
- **AND** los créditos otorgados y utilizados se muestran en su moneda o convertidos a una moneda de referencia

#### Scenario: Indicadores sin actividad

- **WHEN** no existen referidos en el sistema
- **THEN** los indicadores muestran cero
- **AND** el panel no falla

### Requirement: Gestión de recompensas

El panel SHALL permitir consultar recompensas generadas y utilizadas, y anular recompensas con una justificación obligatoria. La anulación SHALL respetar el estado de la recompensa y SHALL dejar rastro en la auditoría.

#### Scenario: Anular recompensa disponible

- **WHEN** el administrador anula una recompensa disponible con motivo
- **THEN** la recompensa pasa a `voided`
- **AND** su crédito deja de aplicarse
- **AND** se registra la auditoría

#### Scenario: Anular recompensa ya aplicada

- **WHEN** el administrador intenta anular una recompensa ya consumida
- **THEN** el sistema exige confirmar la reversión del crédito consumido
- **AND** registra el ajuste negativo correspondiente
- **AND** deja evidencia del impacto en futuras renovaciones

#### Scenario: Anulación sin motivo

- **WHEN** el administrador intenta anular sin justificación
- **THEN** el sistema rechaza la operación con un error de validación

### Requirement: Revisión de reembolsos y contracargos

El panel SHALL exponer los referidos y recompensas afectados por pagos reembolsados o anulados, y SHALL permitir al administrador resolver la revisión revirtiendo la recompensa o manteniéndola con justificación.

#### Scenario: Reembolso detectado

- **WHEN** un pago usado para validar un referido pasa a reembolsado
- **THEN** el referido aparece en la cola de revisión
- **AND** se muestra la recompensa potencialmente afectada

#### Scenario: Resolución de la revisión

- **WHEN** el administrador resuelve la revisión
- **THEN** el sistema registra la decisión, el motivo, el actor y la fecha
- **AND** aplica la reversión o mantiene la recompensa según la decisión

### Requirement: Auditoría de operaciones

Toda modificación administrativa sobre referidos, recompensas o créditos SHALL quedar registrada en una auditoría con identificador, actor, acción, entidad afectada, valores anteriores y nuevos, motivo, dirección IP y fecha. La auditoría SHALL ser consultable y no SHALL poder editarse ni eliminarse desde la aplicación.

#### Scenario: Operación auditada

- **WHEN** el administrador anula una recompensa, rechaza un referido o resuelve un reembolso
- **THEN** se crea un registro de auditoría con los valores anteriores y nuevos

#### Scenario: Consulta de auditoría

- **WHEN** el administrador consulta el historial de operaciones
- **THEN** ve las acciones ordenadas por fecha
- **AND** puede filtrar por cliente, tipo de operación y período

#### Scenario: Intento de borrar auditoría

- **WHEN** cualquier usuario intenta eliminar o modificar un registro de auditoría
- **THEN** el sistema no ofrece esa operación
- **AND** el registro permanece intacto
