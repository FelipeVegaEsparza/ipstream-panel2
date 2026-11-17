# Spec Delta

## Purpose

Agrega las muestras y sesiones crudas en rollups horarios y diarios alineados a la zona horaria del cliente, con definiciones estables de las métricas y retención por capas que no se pierde al recalcular.

## ADDED Requirements

### Requirement: Rollups horarios y diarios

El sistema SHALL agregar las muestras y sesiones crudas en rollups horarios y diarios por cliente y por servicio (radio o televisión). El almacenamiento SHALL ser en UTC y la alineación de cada bucket diario SHALL hacerse en la zona horaria del cliente.

#### Scenario: Agregación por hora

- **WHEN** transcurre una hora
- **THEN** se produce un rollup para esa hora con los agregados del período

#### Scenario: Agregación por día del cliente

- **WHEN** cambia el día en la zona horaria del cliente
- **THEN** el rollup diario agrupa las muestras y sesiones de ese día local, no del día UTC

### Requirement: Definición de métricas agregadas

Cada rollup SHALL incluir, como mínimo: promedio de audiencia, pico de audiencia, minutos-persona, audiencia única, cantidad de sesiones y segundos al aire. El pico SHALL ser el máximo de audiencia concurrente muestreada, NO el pico acumulado reportado por Icecast. El promedio SHALL incluir las muestras con `online = false` como audiencia cero. Las sesiones de TV SHALL contar sesiones consolidadas por espectador, NO recargas de manifiesto.

#### Scenario: Pico del período

- **WHEN** en un día la audiencia alcanzó su máximo en un instante
- **THEN** el pico del rollup corresponde al máximo de las muestras de ese período

#### Scenario: Tiempo de escucha

- **WHEN** se calcula el tiempo de escucha de un período
- **THEN** corresponde a la suma de la audiencia concurrente multiplicada por el intervalo de muestreo

#### Scenario: Uptime

- **WHEN** el período contiene muestras con `online = false`
- **THEN** el uptime refleja solo el tiempo con source activo

#### Scenario: Audiencia única

- **WHEN** un mismo oyente o espectador consume el servicio varias veces en el período
- **THEN** la audiencia única lo cuenta una sola vez por IP

### Requirement: Retención por capas

El sistema SHALL conservar las muestras y sesiones crudas por 30 días y los rollups por al menos 12 meses, purgando lo que exceda cada ventana.

#### Scenario: Purga de datos crudos

- **WHEN** una muestra o sesión cruda supera los 30 días
- **THEN** es eliminada, conservando los rollups agregados

#### Scenario: Rollups antiguos

- **WHEN** un rollup supera la retención configurada (12–24 meses)
- **THEN** es eliminado

### Requirement: Recalculo por cambio de zona horaria sin pérdida de histórico

Al cambiar la zona horaria de un cliente, el sistema SHALL recalcular los rollups diarios de los días cubiertos por los datos crudos disponibles y SHALL conservar los rollups diarios anteriores a esa ventana. Un rollup conservado SHALL mantener la zona horaria con la que fue calculado, de modo que el histórico no quede etiquetado con una zona distinta a la usada para agregarlo.

#### Scenario: Cambio de zona horaria

- **WHEN** el cliente cambia su zona horaria
- **THEN** los días con datos crudos disponibles se reagrupan en la nueva zona

#### Scenario: Histórico anterior a la retención cruda

- **WHEN** existen rollups diarios más antiguos que la ventana de datos crudos
- **THEN** esos rollups se conservan y no se borran durante el recalculo

#### Scenario: Falla durante el recalculo

- **WHEN** el recalculo diario falla a mitad de proceso
- **THEN** el cliente conserva sus rollups anteriores y el sistema lo informa para reintentar
