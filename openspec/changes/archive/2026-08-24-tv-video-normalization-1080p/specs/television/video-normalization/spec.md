## Purpose

Normaliza los videos de Televisión a un formato canónico (1080p H.264/AAC, 4500k) al momento de subirlos y hace que el AutoDJ los reproduzca por remux (`-c:v copy`), reduciendo el costo de CPU por stream de ~3.2 cores a ≈0.

## ADDED Requirements

### Requirement: Los videos subidos se normalizan a un formato canónico
El sistema SHALL normalizar cada video de TV al subirse a un formato canónico: resolución máxima 1920×1080, códec H.264 (yuv420p), 30fps, bitrate de video 4500k y audio AAC 128k 44.1kHz stereo. Si el video original ya cumple el formato canónico, el sistema SHALL almacenarlo sin re-encode (remux/copy).

#### Scenario: Subida de un video 1080p H.264 compatible
- **WHEN** un cliente sube un video 1920×1080 H.264 yuv420p
- **THEN** el sistema lo almacena sin re-encode
- **AND** el ancho/alto/códec registrados coinciden con el archivo almacenado

#### Scenario: Subida de un video de mayor resolución o códec no compatible
- **WHEN** un cliente sube un video 4K/1440p o con códec H.265/AV1
- **THEN** el sistema lo re-encodea a 1920×1080 H.264 yuv420p a 4500k
- **AND** el audio queda en AAC 128k stereo
- **AND** los metadatos registrados reflejan el archivo normalizado

#### Scenario: Subida de un video de menor resolución
- **WHEN** un cliente sube un video menor a 1080p (ej. 720p)
- **THEN** el sistema mantiene su resolución original (no hace upscale)
- **AND** el audio se normaliza a AAC 128k stereo

#### Scenario: Subida falla en la normalización
- **WHEN** el re-encode falla o el archivo no es un video decodificable
- **THEN** el sistema rechaza la subida con un error claro

### Requirement: El AutoDJ reproduce los videos normalizados por remux
El sistema SHALL reproducir los videos del AutoDJ de TV con `-c:v copy -c:a copy` cuando el archivo es H.264 compatible, sin re-encode por stream. El estado del stream SHALL permanecer `autodj` y el encoder SHALL correr como antes, solo que sin costo de transcodificación.

#### Scenario: AutoDJ con videos normalizados
- **WHEN** se inicia el AutoDJ con videos ya normalizados
- **THEN** el encoder reproduce los archivos por remux (copy), sin re-encode
- **AND** el stream queda `autodj` y los espectadores reciben el HLS

#### Scenario: Videos existentes no normalizados
- **WHEN** el AutoDJ encuentra en su playlist un video que aún no cumple el formato canónico
- **THEN** el sistema lo re-encodea en ese momento al formato canónico antes de reproducirlo (fallback), o lo omite con un error claro si no es posible

### Requirement: El bitrate de salida del stream de TV es 4500k
El sistema SHALL emitir el HLS de TV a un bitrate de video de 4500k para los streams normalizados a 1080p.

#### Scenario: Stream a 1080p emite 4500k
- **WHEN** un cliente transmite un video normalizado a 1080p
- **THEN** el HLS se emite a un bitrate de video de 4500k
