# Spec Delta

## Purpose

Agregar muestras y sesiones crudas en métricas horarias y diarias alineadas a la zona horaria del cliente, con definiciones estables y retención por capas.

## ADDED Requirements

### Requirement: Rollups horarios y diarios
El sistema SHALL agregar las muestras y sesiones crudas en rollups horarios y diarios por cliente y por servicio (radio o televisión). El almacenamiento SHALL ser en UTC y la alineación de cada bucket SHALL hacerse en la zona horaria del cliente.

#### Scenario: Agregación por hora
- **WHEN** transcurre una hora
- **THEN** se produce un rollup para esa hora con los agregados del período

#### Scenario: Agregación por día del cliente
- **WHEN** cambia el día en la zona horaria del cliente
- **THEN** el rollup diario agrupa las muestras y sesiones de ese día local, no del día UTC

### Requirement: Definición de métricas agregadas
Cada rollup SHALL incluir, como mínimo: promedio de audiencia, pico de audiencia, minutos-persona (suma de audiencia concurrente por el intervalo), audiencia única, cantidad de sesiones y segundos al aire. El pico SHALL ser el máximo de audiencia concurrente muestreada, y NO el pico acumulado reportado por Icecast.

#### Scenario: Pico del período
- **WHEN** en un día la audiencia alcanzó su máximo en un instante
- **THEN** el pico del rollup corresponde al máximo de las muestras de ese período

#### Scenario: Tiempo de escucha
- **WHEN** se calcula el tiempo de escucha de un período
- **THEN** corresponde a la suma de la audiencia concurrente multiplicada por el intervalo de muestreo

#### Scenario: Uptime
- **WHEN** el período contiene muestras con `online = false`
- **THEN** el uptime refleja solo el tiempo con source activo

### Requirement: Retención por capas
El sistema SHALL conservar las muestras y sesiones crudas por 30 días y los rollups por al menos 12 meses, purgando lo que exceda cada ventana.

#### Scenario: Purga de datos crudos
- **WHEN** una muestra o sesión cruda supera los 30 días
- **THEN** es eliminada, conservando los rollups agregados

#### Scenario: Rollups antiguos
- **WHEN** un rollup supera la retención configurada (12-24 meses)
- **THEN** es eliminado
