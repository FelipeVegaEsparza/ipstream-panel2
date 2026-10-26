# Spec Delta

## Purpose

Permite registrar el consumo de IA por función y mostrar a cada cliente y al administrador en qué se gastan las cuotas mensuales de caracteres TTS y música IA, con desglose e histórico reciente.

## ADDED Requirements

### Requirement: Registro de consumo por función

El sistema SHALL registrar cada consumo facturable de IA con el cliente, el período mensual UTC, la función que lo originó, los caracteres consumidos y los segundos de música consumidos. Las funciones registrables SHALL ser: locución libre, clima/hora, presentador del AutoDJ, cápsulas IA y jingles IA. El registro de detalle NO SHALL alterar la cuota, el bloqueo por límite ni los totales mensuales existentes.

#### Scenario: Consumo de locución libre

- **WHEN** un cliente genera una locución libre nueva con la voz premium
- **THEN** el sistema registra el consumo de caracteres asociado a la función de locución libre

#### Scenario: Consumo de clima u hora

- **WHEN** un cliente genera una locución de clima u hora nueva
- **THEN** el sistema registra el consumo de caracteres asociado a la función de clima/hora

#### Scenario: Consumo del presentador del AutoDJ

- **WHEN** se generan intros nuevas para el presentador IA del AutoDJ
- **THEN** el sistema registra los caracteres asociados a la función de presentador del AutoDJ

#### Scenario: Consumo de cápsula IA

- **WHEN** un cliente crea una cápsula informativa con IA que usa caracteres o música
- **THEN** el sistema registra el consumo correspondiente asociado a la función de cápsulas IA

#### Scenario: Consumo de jingle IA

- **WHEN** un cliente genera un jingle con IA que usa caracteres o música
- **THEN** el sistema registra el consumo correspondiente asociado a la función de jingles IA

#### Scenario: Audio cacheado

- **WHEN** una locución o jingle reutiliza audio ya cacheado y no descuenta cuota
- **THEN** el sistema NO registra un consumo de detalle para esa reutilización

#### Scenario: Cuota agotada

- **WHEN** el consumo supera la cuota disponible y la operación se rechaza por límite
- **THEN** el sistema NO registra consumo de detalle para la operación rechazada

### Requirement: Vista de consumo del cliente

El dashboard del cliente SHALL ofrecer una sección de Consumo IA accesible desde el menú. La sección SHALL mostrar la cuota vigente de caracteres y de música IA, el consumo del mes actual desglosado por función y los totales del mes actual y los 6 meses anteriores. La sección SHALL mostrar únicamente datos del cliente autenticado o del cliente impersonado por un administrador.

#### Scenario: Cliente con IA habilitada

- **WHEN** el cliente abre su sección de Consumo IA
- **THEN** ve los límites, lo usado y lo disponible de caracteres y música para el mes actual

#### Scenario: Desglose por función

- **WHEN** el cliente tiene consumo registrado por función en el mes actual
- **THEN** ve cuántos caracteres y segundos de música corresponden a cada función

#### Scenario: Historial de 6 meses anteriores

- **WHEN** el cliente tiene consumo en meses anteriores
- **THEN** ve los totales mensuales de caracteres y música del mes actual y los 6 meses anteriores

#### Scenario: Cliente sin IA incluida

- **WHEN** el plan del cliente no incluye IA o su cuota es cero
- **THEN** la sección muestra un estado sin cuota disponible, sin errores y sin datos de otros clientes

#### Scenario: Aislamiento entre clientes

- **WHEN** un cliente consulta su sección de Consumo IA
- **THEN** la información corresponde exclusivamente a su propio cliente

### Requirement: Vista global del administrador

El panel de administración SHALL ofrecer una sección global de Consumo IA accesible solo para usuarios administradores. La sección SHALL mostrar los totales globales del mes actual de caracteres y música IA, el desglose por función, el consumo por cliente y los totales globales del mes actual y los 6 meses anteriores.

#### Scenario: Totales globales

- **WHEN** el administrador abre la sección global de Consumo IA
- **THEN** ve los caracteres y segundos de música consumidos por todos los clientes en el mes actual

#### Scenario: Ranking de clientes

- **WHEN** existen clientes con consumo registrado en el mes actual
- **THEN** el administrador ve un listado de clientes ordenado por consumo, con sus caracteres y música utilizados

#### Scenario: Desglose global por función

- **WHEN** existen consumos registrados por función
- **THEN** el administrador ve el total de cada función para el mes actual

#### Scenario: Historial global de 6 meses anteriores

- **WHEN** existen totales de meses anteriores
- **THEN** el administrador ve los totales globales mensuales del mes actual y los 6 meses anteriores

#### Scenario: Acceso no autorizado

- **WHEN** un usuario que no es administrador intenta acceder a la sección global
- **THEN** el sistema le deniega el acceso

### Requirement: Consistencia del desglose y del período histórico

El consumo desglosado por función NO SHALL superar el total mensual registrado para el cliente y el período. Cuando exista consumo anterior al inicio del registro por función, el sistema SHALL mostrarlo como “Sin detalle histórico” en lugar de asignarlo a una función. Los meses anteriores al registro por función SHALL mostrar sus totales mensuales sin inventar un desglose. El período mensual SHALL usar la misma convención UTC que la cuota vigente.

#### Scenario: Consumo previo sin detalle

- **WHEN** el total mensual del cliente es mayor que la suma de sus consumos detallados
- **THEN** la diferencia se muestra como consumo sin detalle histórico

#### Scenario: Mes anterior al registro

- **WHEN** se consulta un mes anterior a la incorporación del registro por función
- **THEN** se muestran sus totales mensuales y el desglose aparece como sin detalle histórico

#### Scenario: Coincidencia de totales

- **WHEN** todo el consumo del mes fue registrado por función
- **THEN** la suma del desglose coincide con el total mensual y no se muestra una fila de consumo sin detalle
