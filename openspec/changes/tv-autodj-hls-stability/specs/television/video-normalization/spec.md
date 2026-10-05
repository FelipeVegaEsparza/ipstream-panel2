# Spec Delta

## MODIFIED Requirements

### Requirement: Los videos subidos se normalizan a un formato canónico
El sistema SHALL normalizar cada video de TV al subirse a un formato canónico **estricto y uniforme**: resolución fija 1920×1080 con letterbox (padding negro para preservar el aspecto), códec H.264 perfil main nivel 4.0 (yuv420p), 30 fps CFR, GOP fijo con keyframe cada 2 segundos, bitrate de video 4500k, y audio AAC 128k 44.1 kHz estéreo (agregando una pista de silencio si el origen no tiene audio). El sistema SHALL re-encodear todo video al formato canónico y NO SHALL omitir el re-encode por considerarlo "suficientemente" compatible, porque el remux no puede garantizar keyframes ni uniformidad de parámetros.

#### Scenario: Subida de un video 1080p H.264 compatible
- **WHEN** un cliente sube un video 1920×1080 H.264 yuv420p
- **THEN** el sistema lo re-encodea igualmente al canónico estricto (mismo perfil, GOP y audio)
- **AND** el archivo resultante tiene resolución 1920×1080, keyframes cada 2 s y audio AAC 128k estéreo
- **AND** los metadatos registrados coinciden con el archivo almacenado

#### Scenario: Subida de un video de mayor resolución o códec no compatible
- **WHEN** un cliente sube un video 4K/1440p o con códec H.265/AV1
- **THEN** el sistema lo re-encodea a 1920×1080 H.264 yuv420p a 4500k con padding si el aspecto no es 16:9
- **AND** el audio queda en AAC 128k 44.1 kHz estéreo
- **AND** los metadatos registrados reflejan el archivo normalizado

#### Scenario: Subida de un video de menor resolución
- **WHEN** un cliente sube un video menor a 1080p (ej. 720p)
- **THEN** el sistema lo escala a 1920×1080 con letterbox (sin deformar) para que todos los videos tengan idéntica resolución
- **AND** el audio se normaliza a AAC 128k 44.1 kHz estéreo
- **AND** el video resultante tiene keyframes cada 2 s

#### Scenario: Subida falla en la normalización
- **WHEN** el re-encode falla o el archivo no es un video decodificable
- **THEN** el sistema rechaza la subida con un error claro

### Requirement: El AutoDJ reproduce los videos normalizados por remux
El sistema SHALL emitir el AutoDJ de TV concatenando los videos canónicos con `-c:v copy -c:a copy`, SIN re-encode por stream, y SHALL estabilizar los timestamps del flujo (`genpts`/`avoid_negative_ts` y FLV limpio) para que HLS reciba una línea de tiempo continua. El comando SHALL incluir las duraciones de cada archivo en la playlist de concatenación y SHALL reproducir en loop sin discontinuidades. El estado del stream SHALL permanecer `autodj`.

#### Scenario: AutoDJ con videos normalizados
- **WHEN** se inicia el AutoDJ con videos que cumplen el canónico estricto
- **THEN** el encoder los concatena por copy con timestamps monotónicos
- **AND** HLS produce segmentos de forma continua (≈cada 2–3 s) sin cortes
- **AND** el stream queda `autodj` y los espectadores reciben video que avanza

#### Scenario: Videos existentes no normalizados
- **WHEN** el AutoDJ encuentra en su playlist un video que no cumple el formato canónico estricto
- **THEN** el sistema lo re-encodea al canónico estricto antes de reproducirlo (en background) y lo excluye del aire mientras no esté `ready`, o lo omite con un error claro si no es posible
