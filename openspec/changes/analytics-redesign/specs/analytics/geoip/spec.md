# Spec Delta

## Purpose

Enriquecer cada sesión de escucha con su ubicación aproximada y la clasificación de dispositivo/navegador, sin depender de servicios externos.

## ADDED Requirements

### Requirement: Ubicación aproximada por IP
El sistema SHALL resolver país y ciudad aproximados de cada sesión a partir de su IP, usando una base de geolocalización local, sin realizar llamadas a servicios externos.

#### Scenario: IP resoluble
- **WHEN** una sesión tiene una IP presente en la base de geolocalización
- **THEN** la sesión queda asociada a un país y, si está disponible, a una ciudad

#### Scenario: IP no resoluble
- **WHEN** una sesión no puede resolverse (IP privada, desconocida o base sin datos)
- **THEN** la sesión se registra con ubicación desconocida sin romper la recolección

### Requirement: Clasificación de dispositivo y navegador
El sistema SHALL clasificar cada sesión por tipo de dispositivo y navegador a partir de su user-agent.

#### Scenario: User-agent reconocido
- **WHEN** una sesión tiene un user-agent reconocible
- **THEN** queda clasificada por dispositivo (por ejemplo, móvil, escritorio, TV) y navegador

#### Scenario: User-agent ausente o desconocido
- **WHEN** una sesión no tiene user-agent o es desconocido
- **THEN** se clasifica como desconocido sin romper la recolección

### Requirement: Privacidad de la IP
El sistema SHALL almacenar la IP únicamente en la sesión cruda y NO SHALL exponer la IP completa en la interfaz del cliente; la analítica mostrada SHALL limitarse a ubicación y dispositivo agregados.

#### Scenario: Analítica sin IP
- **WHEN** el cliente consulta la ubicación de su audiencia
- **THEN** ve país/ciudad y dispositivo, pero no la IP de cada oyente
