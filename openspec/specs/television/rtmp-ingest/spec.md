# RTMP Ingest Specification

## Purpose

Define la ingesta RTMP de Televisión: cómo un DJ conecta su codificador (OBS) al canal, cómo el sistema detecta y distingue al DJ del AutoDJ, cómo se produce el takeover entre ambos, y qué URL HLS consume el espectador según el estado del stream.

## Requirements

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
El sistema SHALL ofrecer una ruta de ingesta vía RTMP compatible con **H.264 estándar** (x264/NVENC/QuickSync/AMF en OBS con "enhanced streaming" desactivado), publicando en el app `relay` de SRS con un stream key obligatorio y validado. El sistema SHALL re-encodear la señal a H.264 compatible con navegadores antes de publicarla en `dj/<streamKey>`. No se garantiza la ingesta de HEVC (H.265) ni AV1 por enhanced RTMP: con SRS v5 esos códecs se descartan en ingesta y el HLS resultante no contiene video decodificable. La interfaz SHALL mostrar el servidor de ingesta, el stream key del cliente y el requisito de códec H.264.

#### Scenario: DJ publica vía relay
- **WHEN** un DJ publica a `rtmp://<host>:1935/relay` con el stream key de su cliente y un encoder H.264 estándar (p.ej. x264)
- **THEN** SRS valida el stream key contra los streams de video del cliente
- **AND** un transcoder FFmpeg jala la señal, la re-encoda a H.264 (yuv420p) y la publica en `dj/<streamKey>`
- **AND** el stream queda `live` y los espectadores reciben la señal del DJ

#### Scenario: Se rechaza un stream key inválido
- **WHEN** un DJ publica a `rtmp://<host>:1935/relay` con un stream key desconocido
- **THEN** SRS deniega el publish
- **AND** el codificador (OBS) muestra un error de conexión
- **AND** no se inicia ningún transcoder

#### Scenario: La interfaz muestra servidor y stream key
- **WHEN** un cliente consulta la página de conexión OBS
- **THEN** se muestra la URL de ingesta `rtmp://<host>:1935/relay`, el stream key del cliente y la indicación de usar H.264 estándar
- **AND** el stream key es el mismo que usa la conexión directa (`dj`)

#### Scenario: DJ publica con HEVC/AV1 por enhanced RTMP
- **WHEN** un DJ publica vía relay con HEVC (H.265) o AV1 usando enhanced RTMP
- **THEN** el servidor descarta los paquetes de video en ingesta (códec no reconocido)
- **AND** el HLS del stream puede marcar `live` pero sin track de video decodificable (pantalla negra en el navegador)
- **AND** la interfaz indica que solo se soporta H.264 estándar

#### Scenario: El DJ se desconecta del relay
- **WHEN** el DJ que publicaba vía relay se desconecta
- **THEN** el agente detiene el transcoder de ese cliente
- **AND** el AutoDJ del cliente se reanuda