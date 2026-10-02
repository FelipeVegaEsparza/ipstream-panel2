# Spec Delta

## MODIFIED Requirements

### Requirement: Los videos subidos se normalizan a un formato canónico
El sistema SHALL normalizar cada video de TV al formato canónico: resolución máxima 1920×1080, códec H.264 (yuv420p), 30fps, bitrate de video 4500k y audio AAC 128k 44.1kHz stereo. Si el video original ya cumple el formato canónico, el sistema SHALL almacenarlo sin re-encode (remux/copy). La normalización SHALL ejecutarse como un job en background después de completarse la subida (no dentro de la request de subida) y el track SHALL exponer un estado de procesamiento (`pending` → `processing` → `ready`, o `error`) visible para el operador.

#### Scenario: Subida de un video 1080p H.264 compatible
- **WHEN** un cliente sube un video 1920×1080 H.264 yuv420p
- **THEN** el sistema lo almacena sin re-encode
- **AND** el ancho/alto/códec registrados coinciden con el archivo almacenado
- **AND** el track queda disponible (`ready`) sin pasar por re-encode

#### Scenario: Subida de un video de mayor resolución o códec no compatible
- **WHEN** un cliente sube un video 4K/1440p o con códec H.265/AV1
- **THEN** el sistema lo re-encodea en background a 1920×1080 H.264 yuv420p a 4500k
- **AND** el track muestra estado `processing` mientras dura el re-encode y pasa a `ready` al terminar
- **AND** el audio queda en AAC 128k stereo
- **AND** los metadatos registrados reflejan el archivo normalizado

#### Scenario: Subida de un video de menor resolución
- **WHEN** un cliente sube un video menor a 1080p (ej. 720p)
- **THEN** el sistema mantiene su resolución original (no hace upscale)
- **AND** el audio se normaliza a AAC 128k stereo

#### Scenario: Subida falla en la normalización
- **WHEN** el re-encode falla o el archivo no es un video decodificable
- **THEN** la subida no se rechaza pero el track queda marcado en estado `error` con un mensaje claro
- **AND** el video no queda disponible para reproducir ni para agregar a playlists mientras esté en `error`
