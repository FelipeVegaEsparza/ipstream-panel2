## MODIFIED Requirements

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
