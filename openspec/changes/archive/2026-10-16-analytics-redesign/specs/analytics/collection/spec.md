# Spec Delta

## Purpose

Recolecta de forma continua y confiable la audiencia y las sesiones de escucha de radio y televisión, de modo que exista un histórico fiel para la analítica.

## ADDED Requirements

### Requirement: Muestreo de audiencia de radio
El sistema SHALL registrar una muestra de audiencia por cada stream de radio habilitado cada 1 minuto, aunque el stream esté apagado. Cada muestra SHALL incluir: instante en UTC, cliente, stream, cantidad de oyentes concurrentes, pico muestreado, bitrate y metadatos actuales (título/artista), más una marca `online` que indica si había un source activo.

#### Scenario: Stream al aire
- **WHEN** un stream de radio tiene un source activo
- **THEN** cada minuto se registra una muestra con `online = true` y los oyentes concurrentes leídos de Icecast

#### Scenario: Stream apagado
- **WHEN** un stream de radio habilitado no tiene source activo
- **THEN** cada minuto se registra una muestra con `online = false` y 0 oyentes, para que el promedio y el uptime sean representativos

#### Scenario: Muestras sin huecos
- **WHEN** el colector se reinicia
- **THEN** reanuda el muestreo en el siguiente minuto sin perder la continuidad de los stream habilitados

### Requirement: Muestreo de audiencia de televisión
El sistema SHALL registrar una muestra de espectadores por cada stream de video habilitado cada 1 minuto, con instante en UTC, cliente, stream, cantidad de espectadores y marca `online`. Los espectadores SHALL contarse como las IPs únicas que solicitaron el manifiesto `.m3u8` del stream en una ventana reciente.

#### Scenario: TV al aire con espectadores
- **WHEN** un stream de video está al aire y hay solicitudes recientes a su manifiesto
- **THEN** cada minuto se registra una muestra con la cantidad de espectadores y `online = true`

#### Scenario: TV sin espectadores
- **WHEN** un stream de video está al aire sin solicitudes recientes
- **THEN** se registra una muestra con 0 espectadores y `online = true`

### Requirement: Sesiones de escucha de radio desde el access log
El sistema SHALL derivar una sesión de escucha por cada petición de audio a un mount de radio registrada en el access log del proxy, con: instante de inicio, IP real del oyente, duración, bytes transferidos y user-agent. La IP SHALL tomarse del access log del proxy y NO de Icecast, porque Icecast está detrás de un proxy y solo ve la IP del proxy.

#### Scenario: Sesión completada
- **WHEN** un oyente termina de escuchar un mount de radio
- **THEN** se registra una sesión con la IP real del oyente, su duración y bytes

#### Scenario: Peticiones que no son escucha
- **WHEN** el access log contiene peticiones de estado, administración o metadatos y no de audio
- **THEN** esas peticiones NO generan sesiones de escucha

### Requirement: Sesiones de visualización de televisión desde el access log
El sistema SHALL derivar una sesión de visualización por cada petición de manifiesto HLS de un stream de video, con IP real, duración, bytes y user-agent, desde el access log del proxy.

#### Scenario: Sesión de video completada
- **WHEN** un espectador termina de ver un stream de video
- **THEN** se registra una sesión de visualización con su IP real, duración y bytes

### Requirement: Recolección idempotente y por nodo
El parseo de logs SHALL ser idempotente (no SHALL duplicar sesiones ya registradas) y SHALL tolerar reinicios del agente. En una instalación multi-nodo, cada agente SHALL recolectar únicamente los streams que aloja.

#### Scenario: Reprocesamiento del mismo log
- **WHEN** el agente reintenta parsear un tramo de log ya procesado
- **THEN** no se duplican las sesiones ya registradas

#### Scenario: Nodo remoto
- **WHEN** un stream se aloja en un nodo remoto
- **THEN** el agente de ese nodo recolecta sus muestras y sesiones, y los demás nodos no lo hacen
