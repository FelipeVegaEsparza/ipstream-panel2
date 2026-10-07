# Spec Delta

## Purpose

Sirve el canal de Televisión como HLS adaptativo (ABR): un ladder de dos rendiciones (1080p + 720p) con manifiestos vivos por rendición y reproducción automática, para que cada espectador reciba la mejor calidad que su conexión sostiene sin que nadie elija.

## ADDED Requirements

### Requirement: El canal de TV se empaqueta en un ladder ABR de dos rendiciones
El sistema SHALL empaquetar cada video de TV (subidas nuevas) en dos rendiciones H.264 — 1080p (~2000k) y 720p (~1000k) — con segmentos de 2 s, keyframes/GOP alineados entre rendiciones y audio AAC 128k 44.1k. El bitrate y la resolución de cada rendición SHALL ser configurables por entorno, con default 1080p + 720p.

#### Scenario: Subida nueva se empaqueta en dos rendiciones
- **WHEN** un cliente sube un video de TV
- **THEN** el sistema genera dos rendiciones (1080p y 720p) con segmentos de 2 s alineados por índice
- **AND** registra el `hlsPath` y metadatos de cada rendición del track

#### Scenario: Ladder configurable por entorno
- **WHEN** se define el ladder por variables de entorno
- **THEN** el empaquetado usa esos valores
- **AND** el default es 1080p (~2000k) + 720p (~1000k)

#### Scenario: Fuente de menor resolución que una rendición
- **WHEN** el video fuente es menor que 720p
- **THEN** el sistema no hace upscale: mantiene la resolución nativa como rendición máxima disponible

### Requirement: El canal expone un master playlist con las variantes
El sistema SHALL exponer un `master.m3u8` del canal que liste las rendiciones (con `RESOLUTION` y `BANDWIDTH`) y apunte a un manifiesto vivo por rendición.

#### Scenario: Master del canal con variantes
- **WHEN** un player pide el HLS del canal
- **THEN** recibe un `master.m3u8` que lista las rendiciones disponibles (1080p y 720p)
- **AND** cada variante apunta a su manifiesto vivo (`live/<rendition>.m3u8`)

### Requirement: Los manifiestos vivos por rendición quedan sincronizados
El stitcher SHALL emitir un manifiesto vivo por rendición con la MISMA posición de ciclo y el MISMO conjunto de segmentos (mapeados por índice) en todas las calidades, de modo que un cambio de rendición no salte de posición.

#### Scenario: Cambio de rendición sin salto
- **WHEN** el player cambia de 720p a 1080p a mitad del ciclo
- **THEN** reproduce el mismo contenido en la nueva calidad (mismo segmento por índice)
- **AND** no hay reinicio ni salto de posición

#### Scenario: Rendiciones alineadas por índice
- **WHEN** el ciclo del canal se arma a partir de una rendición de referencia
- **THEN** todas las rendiciones listan el mismo número y orden de segmentos

### Requirement: La reproducción es adaptativa automática
El player (dashboard y `/tv/<key>`) SHALL usar el master y adaptar la calidad automáticamente según el ancho de banda, sin selección manual del usuario.

#### Scenario: Adaptación ante cambios de red
- **WHEN** la conexión del espectador empeora
- **THEN** el player baja de rendición automáticamente
- **AND** cuando la conexión mejora, vuelve a la rendición más alta

### Requirement: La URL pública del canal se mantiene estable
Las URLs públicas (`/tv/<key>.m3u8` y `/vod/<key>/…`) SHALL seguir siendo el punto de entrada del canal; el flujo adaptativo SHALL resolverse bajo el mismo `streamKey`.

#### Scenario: URL estable sirve el HLS adaptativo
- **WHEN** un espectador abre `/tv/<key>.m3u8`
- **THEN** recibe el HLS adaptativo (master) del canal
- **AND** los segmentos de cada rendición se sirven bajo el mismo `streamKey`

### Requirement: Los videos de una sola rendición siguen reproduciéndose
El sistema SHALL reproducir sin error los tracks existentes empaquetados con una sola rendición (compatibilidad hacia atrás).

#### Scenario: Track legado single-rendition
- **WHEN** el canal incluye un track empaquetado antes del ABR (una rendición)
- **THEN** el canal lo expone como una variante única
- **AND** se reproduce con normalidad
