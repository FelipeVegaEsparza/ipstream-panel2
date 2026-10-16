# Spec Delta

## Purpose

Definir que la zona horaria del cliente se configura en Datos básicos y rige tanto la programación como la analítica.

## ADDED Requirements

### Requirement: Configuración de zona horaria en Datos básicos
El sistema SHALL permitir al cliente ver y cambiar su zona horaria desde la sección de Datos básicos, y SHALL dejar de exponer el selector de zona horaria dentro de la parrilla de streaming. La zona horaria SHALL validarse como una zona IANA válida.

#### Scenario: Cambiar la zona horaria
- **WHEN** el cliente selecciona una zona horaria válida en Datos básicos
- **THEN** la zona horaria del cliente queda guardada

#### Scenario: Zona horaria inválida
- **WHEN** se envía una zona horaria no válida
- **THEN** el sistema rechaza el cambio y conserva el valor anterior

#### Scenario: Selector fuera de la parrilla
- **WHEN** el cliente abre la parrilla de streaming
- **THEN** el selector de zona horaria ya no se muestra allí

### Requirement: Aplicación de la zona horaria
La zona horaria del cliente SHALL aplicarse tanto a la interpretación de la programación como a la agrupación de la analítica (buckets horarios y diarios).

#### Scenario: Parrilla en zona del cliente
- **WHEN** se evalúa una franja de programación
- **THEN** los horarios se interpretan en la zona horaria del cliente

#### Scenario: Analítica en zona del cliente
- **WHEN** se agrupa la audiencia por día u hora
- **THEN** los buckets se alinean a la zona horaria del cliente
