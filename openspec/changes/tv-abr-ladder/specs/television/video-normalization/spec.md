# Spec Delta

## MODIFIED Requirements

### Requirement: Los videos subidos se normalizan a un formato canónico
El sistema SHALL empaquetar cada video de TV al subirse en un **ladder ABR de dos rendiciones**: `1080p` (máx 1920×1080, H.264 yuv420p, 30fps CFR, keyframe cada 2 s, ~2000k) y `720p` (1280×720, ~1000k), con audio AAC 128k 44.1kHz estéreo. Los bitrates y resoluciones del ladder SHALL ser configurables por entorno, con default 1080p+720p. El sistema no SHALL hacer upscale: si la fuente es menor que una rendición, mantiene la resolución nativa como rendición máxima. Si el archivo original ya cumple una rendición y tiene keyframes regulares, esa rendición SHALL empaquetarse sin re-encode (copy).

#### Scenario: Subida de un video 1080p H.264 compatible
- **WHEN** un cliente sube un video 1920×1080 H.264 yuv420p
- **THEN** el sistema lo usa como rendición 1080p (por copy si ya cumple) y genera además la 720p
- **AND** el ancho/alto/códec registrados de cada rendición coinciden con los archivos almacenados

#### Scenario: Subida de un video de mayor resolución o códec no compatible
- **WHEN** un cliente sube un video 4K/1440p o con códec H.265/AV1
- **THEN** el sistema lo re-encodea a las rendiciones 1080p y 720p H.264 yuv420p
- **AND** el audio queda en AAC 128k stereo
- **AND** los metadatos registrados reflejan el ladder empaquetado

#### Scenario: Subida de un video de menor resolución
- **WHEN** un cliente sube un video menor a 1080p (ej. 720p)
- **THEN** el sistema mantiene su resolución nativa como rendición máxima (no hace upscale)
- **AND** el audio se normaliza a AAC 128k stereo

#### Scenario: Subida falla en la normalización
- **WHEN** el re-encode falla o el archivo no es un video decodificable
- **THEN** el sistema rechaza la subida con un error claro

#### Scenario: Configuración del ladder por entorno
- **WHEN** se define el ladder por variables de entorno
- **THEN** el empaquetado usa esos valores
- **AND** el default es 1080p (~2000k) + 720p (~1000k)

## REMOVED Requirements

### Requirement: El bitrate de salida del stream de TV es 4500k
**Reason**: Reemplazado por el ladder ABR (1080p + 720p). El canal ya no emite una única rendición de 4500k.
**Migration**: El empaquetado produce el ladder; los tracks existentes de una sola rendición siguen reproduciéndose como variante única.
