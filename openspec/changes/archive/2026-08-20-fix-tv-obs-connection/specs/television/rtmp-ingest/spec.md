## Purpose

Define la ingesta RTMP de Televisión: cómo un DJ conecta su codificador (OBS) al canal, cómo el sistema detecta y distingue al DJ del AutoDJ, cómo se produce el takeover entre ambos, y qué URL HLS consume el espectador según el estado del stream.

## ADDED Requirements

### Requirement: Servidor RTMP disponible
El sistema SHALL exponer un listener RTMP en el puerto 1935, atendiendo el app `live` y el app `dj`. El contenedor SRS SHALL arrancar de forma reproducible desde el deploy, sin depender de archivos de config ausentes.

#### Scenario: SRS arranca tras el deploy
- **WHEN** se ejecuta el deploy con la configuración de SRS del repositorio
- **THEN** el contenedor SRS queda healthy
- **AND** el puerto 1935 acepta conexiones RTMP

#### Scenario: El puerto RTMP está publicado públicamente
- **WHEN** un codificador externo (OBS) intenta conectar a `rtmp://<host>:1935`
- **THEN** la conexión TCP llega al listener RTMP
- **AND** el publish se procesa por el app indicado (`live` o `dj`)

### Requirement: DJ puede publicar su stream
Un DJ con credenciales válidas SHALL poder publicar su señal vía RTMP al app `dj` usando su stream key. El stream key SHALL ser estable y derivarse del `clientId`.

#### Scenario: Publish directo con stream key válido
- **WHEN** OBS publica a `rtmp://<host>:1935/dj/<streamKey>` con un stream key válido
- **THEN** SRS acepta el publish
- **AND** el sistema registra al DJ como conectado
- **AND** el estado del stream pasa a `live`

#### Scenario: Publish con stream key desconocido
- **WHEN** un codificador intenta publicar con un stream key que no corresponde a ningún cliente
- **THEN** el publish es rechazado por el sistema (hook devuelve error)
- **AND** no se registra ningún DJ ni cambia el estado del stream

### Requirement: Detección del DJ por stream key
El sistema SHALL identificar al cliente a partir del stream key del publish, sin depender de campos que SRS no envía. Los hooks SHALL distinguir entre publishes del encoder (app `live`) y publishes del DJ (app `dj`).

#### Scenario: El hook resuelve el cliente por el stream
- **WHEN** SRS notifica `on-publish` con el app `dj` y el campo `stream`
- **THEN** el sistema resuelve el `clientId` comparando el stream key
- **AND** actualiza el estado del DJ y del stream en consecuencia

#### Scenario: El publish del encoder no se confunde con un DJ
- **WHEN** el encoder de AutoDJ publica en el app `live` con el mismo stream key
- **THEN** el sistema no registra un DJ conectado
- **AND** el estado del stream permanece `autodj`

### Requirement: Takeover entre DJ y AutoDJ
Cuando el DJ publica en el app `dj`, el sistema SHALL detener el AutoDJ (encoder en `live`) y servir la señal del DJ. Cuando el DJ se desconecta, el sistema SHALL reanudar el AutoDJ.

#### Scenario: DJ se conecta con AutoDJ activo
- **WHEN** un DJ publica en `dj/<streamKey>` mientras el AutoDJ transmite en `live/<streamKey>`
- **THEN** el encoder de AutoDJ se detiene
- **AND** el estado del stream pasa a `live`
- **AND** los espectadores reciben la señal del DJ

#### Scenario: DJ se desconecta
- **WHEN** el DJ deja de publicar en `dj/<streamKey>`
- **THEN** el sistema registra la desconexión del DJ
- **AND** reanuda el encoder de AutoDJ
- **AND** el estado del stream pasa a `autodj`

#### Scenario: DJ se desconecta sin AutoDJ previo
- **WHEN** el DJ deja de publicar y no había AutoDJ corriendo
- **THEN** el sistema intenta reanudar el AutoDJ
- **AND** el estado refleja la reanudación o queda `off` si no hay playlist disponible

### Requirement: URL HLS según estado del stream
El sistema SHALL exponer una URL HLS que dependa del estado del stream: app `dj` cuando está `live`, app `live` cuando está `autodj`. Ambas rutas SHALL ser alcanzables por los espectadores (incluyendo a través del proxy HTTP).

#### Scenario: Espectador durante un DJ en vivo
- **WHEN** el stream está en estado `live`
- **THEN** la URL HLS del espectador apunta a `/dj/<streamKey>.m3u8`
- **AND** la URL resuelve a la señal del DJ

#### Scenario: Espectador durante AutoDJ
- **WHEN** el stream está en estado `autodj`
- **THEN** la URL HLS del espectador apunta a `/live/<streamKey>.m3u8`
- **AND** la URL resuelve a la señal del AutoDJ

### Requirement: Conexión universal vía relay
El sistema SHALL ofrecer una ruta de ingesta compatible con OBS enhanced RTMP y cualquier códec, a través de un relay por cliente. Cada cliente SHALL tener un puerto relay dedicado, y la interfaz SHALL mostrar el puerto real del cliente.

#### Scenario: DJ publica vía relay
- **WHEN** un DJ publica a `rtmp://<host>:<puertoRelayDelCliente>/live/relay`
- **THEN** el relay acepta la conexión
- **AND** re-encoda la señal y la publica en `dj/<streamKey>`
- **AND** el stream queda `live` y los espectadores reciben la señal del DJ

#### Scenario: La interfaz muestra el puerto relay real
- **WHEN** un cliente consulta la página de conexión OBS
- **THEN** se muestra la URL relay con el puerto asignado a ese cliente (no un puerto fijo)
- **AND** el estado del relay (activo/inactivo) refleja si el proceso está escuchando

#### Scenario: El relay se inicia junto al stream
- **WHEN** se inicia el AutoDJ de un cliente
- **THEN** el relay de ese cliente se pone a escuchar en su puerto dedicado
- **AND** permanece a la espera de un codificador