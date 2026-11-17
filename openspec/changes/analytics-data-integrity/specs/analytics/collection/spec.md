# Spec Delta

## Purpose

Recolecta de forma confiable la audiencia y las sesiones de escucha de radio y televisión desde Icecast y el access log del proxy, con cobertura de todos los modos de playout y acotada al nodo que aloja cada stream.

## ADDED Requirements

### Requirement: Muestreo de audiencia de radio

El sistema SHALL registrar una muestra por cada stream de radio habilitado cada minuto, aunque el stream esté apagado. Cada muestra SHALL incluir instante en UTC, cliente, stream, oyentes concurrentes, pico muestreado, bitrate, metadatos actuales (título/artista) y una marca `online` que indique si había un source activo.

#### Scenario: Stream al aire

- **WHEN** un stream de radio tiene un source activo
- **THEN** cada minuto se registra una muestra con `online = true` y los oyentes concurrentes leídos de Icecast

#### Scenario: Stream apagado

- **WHEN** un stream de radio habilitado no tiene source activo
- **THEN** cada minuto se registra una muestra con `online = false` y 0 oyentes, para que el promedio y el uptime sean representativos

#### Scenario: Reinicio del colector

- **WHEN** el colector se reinicia
- **THEN** reanuda el muestreo en el siguiente minuto sin perder la continuidad de los streams habilitados

### Requirement: Muestreo de audiencia de televisión

El sistema SHALL registrar una muestra de espectadores por cada stream de video habilitado cada minuto, con instante en UTC, cliente, stream, cantidad de espectadores y marca `online`. Los espectadores SHALL contarse como las IPs únicas que solicitaron contenido de reproducción del stream en una ventana reciente, incluyendo el HLS en vivo de SRS y los manifiestos y segmentos del playout VOD2Live.

#### Scenario: TV al aire con espectadores

- **WHEN** un stream de video está al aire y hay solicitudes recientes de reproducción de ese stream
- **THEN** cada minuto se registra una muestra con la cantidad de espectadores y `online = true`

#### Scenario: TV al aire sin espectadores

- **WHEN** un stream de video está al aire sin solicitudes recientes de reproducción
- **THEN** se registra una muestra con 0 espectadores y `online = true`

#### Scenario: Playout VOD2Live

- **WHEN** el stream se sirve como manifiesto vivo mediante `/vod/<key>/live.m3u8`, playlists por rendición o segmentos
- **THEN** las solicitudes de esos recursos cuentan como reproducción del stream, igual que el HLS en vivo

#### Scenario: Manifiesto maestro solicitado una sola vez

- **WHEN** un espectador solicita el manifiesto maestro una vez y luego solo recarga playlists o segmentos
- **THEN** el espectador sigue contando en la ventana reciente mientras haya solicitudes de reproducción

### Requirement: Sesiones de escucha de radio desde el access log

El sistema SHALL derivar una sesión de escucha por cada petición de audio a un mount de radio registrada en el access log del proxy, con instante de inicio, IP real del oyente, duración, bytes transferidos y user-agent. La IP SHALL tomarse del access log del proxy y NO de Icecast, porque Icecast está detrás de un proxy y solo ve la IP del proxy.

#### Scenario: Sesión completada

- **WHEN** un oyente termina de escuchar un mount de radio
- **THEN** se registra una sesión con la IP real del oyente, su duración y bytes

#### Scenario: Peticiones que no son escucha

- **WHEN** el access log contiene peticiones de estado, administración o metadatos y no de audio
- **THEN** esas peticiones NO generan sesiones de escucha

### Requirement: Sesiones de visualización de televisión desde el access log

El sistema SHALL derivar sesiones de visualización con IP real, duración, bytes y user-agent desde el access log del proxy. Una sesión de TV SHALL representar a un espectador de un stream, no a cada recarga del manifiesto HLS: las solicitudes repetidas de la misma IP al mismo stream dentro de una ventana de inactividad SHALL consolidarse en una sola sesión.

#### Scenario: Sesión de video completada

- **WHEN** un espectador termina de ver un stream de video
- **THEN** se registra una sesión de visualización con su IP real, duración y bytes

#### Scenario: Recargas del manifiesto

- **WHEN** un espectador mantiene la reproducción y el reproductor recarga el manifiesto varias veces
- **THEN** las recargas se consolidan en una sola sesión mientras no supere la ventana de inactividad

#### Scenario: Nuevo visionado

- **WHEN** la misma IP vuelve a reproducir el stream después de superar la ventana de inactividad
- **THEN** se registra una nueva sesión

#### Scenario: Playout VOD2Live

- **WHEN** el stream se sirve mediante manifiestos por rendición o segmentos del playout VOD2Live
- **THEN** esas solicitudes alimentan las sesiones de visualización del stream

### Requirement: Ingesta confiable del access log

El sistema SHALL leer el tramo reciente del access log sin descartarlo por límites internos de tamaño del proceso que ejecuta la lectura. Si la lectura falla por tamaño, timeout o error del contenedor del proxy, el sistema SHALL registrar una advertencia visible y reintentar en el siguiente ciclo; NO SHALL devolver una lista vacía sin dejar rastro.

#### Scenario: Tramo de log mayor al límite por defecto

- **WHEN** el tramo del access log supera el tamaño máximo por defecto de la lectura de procesos
- **THEN** la lectura se completa y el parseo de sesiones se ejecuta normalmente

#### Scenario: Fallo de lectura

- **WHEN** el contenedor del proxy no responde o la lectura excede el timeout
- **THEN** se registra una advertencia y el siguiente ciclo vuelve a intentar, sin borrar ni duplicar sesiones ya guardadas

### Requirement: Cobertura de logs por nodo

Cada agente SHALL leer el access log de su propio proxy. Cuando radio y TV compartan un mismo archivo de log en un nodo, la configuración del nodo SHALL indicar explícitamente ese path para ambos servicios. Un nodo cuyo archivo de radio no existe NO SHALL considerarse sin audiencia: la falta de archivo SHALL tratarse como un problema de configuración visible.

#### Scenario: Nodo con radio y TV en el mismo archivo

- **WHEN** el proxy del nodo escribe radio y TV en `/data/access.log`
- **THEN** el agente del nodo lee ese archivo para las sesiones de ambos servicios

#### Scenario: Archivo de radio ausente

- **WHEN** el path configurado para radio no existe en el contenedor del proxy
- **THEN** el sistema registra una advertencia de configuración en lugar de asumir que no hubo oyentes

### Requirement: Recolección idempotente y por nodo

El parseo de logs SHALL ser idempotente (no SHALL duplicar sesiones ya registradas) y SHALL tolerar reinicios del agente. En una instalación multi-nodo, cada agente SHALL recolectar únicamente los streams que aloja, mientras los rollups agregados SHALL cubrir a todos los clientes de la base central.

#### Scenario: Reprocesamiento del mismo log

- **WHEN** el agente reintenta parsear un tramo de log ya procesado
- **THEN** no se duplican las sesiones ya registradas

#### Scenario: Nodo remoto

- **WHEN** un stream se aloja en un nodo remoto
- **THEN** el agente de ese nodo recolecta sus muestras y sesiones, y los demás nodos no duplican su muestreo
