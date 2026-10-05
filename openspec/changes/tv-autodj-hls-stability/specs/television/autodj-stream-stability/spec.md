# Spec Delta

## Purpose

Garantiza que el AutoDJ de Televisión emita un stream continuo y reproducible: timestamps monotónicos, segmentos HLS alineados a keyframes, transiciones y loop sin cortes, y verificación de que el playlist es homogéneo antes de salir al aire.

## ADDED Requirements

### Requirement: El AutoDJ emite un stream continuo y sin cortes
El sistema SHALL emitir el AutoDJ con una línea de tiempo monotónica y continua. El flujo SHALL avanzar de forma indefinida, sin que HLS deje de producir segmentos durante la reproducción, tanto en el arranque como en cada transición entre videos y en el loop del playlist.

#### Scenario: Inicio del AutoDJ
- **WHEN** el operador inicia el AutoDJ con un playlist de videos canónicos
- **THEN** el HLS comienza a producir segmentos y el video avanza más allá de la primera ventana inicial (no se estanca a los pocos segundos)

#### Scenario: Transición entre dos videos
- **WHEN** termina un video y comienza el siguiente del playlist
- **THEN** el stream continúa sin congelarse ni mostrar pantalla negra, y el HLS sigue generando segmentos

#### Scenario: Loop del playlist
- **WHEN** el AutoDJ reproduce el último video de la lista y vuelve al primero
- **THEN** los timestamps continúan siendo monotónicos y el HLS no reinicia con discontinuidad ni se detiene

### Requirement: La playlist de emisión es conforme y declara duraciones
El sistema SHALL construir la playlist de concatenación usando solo tracks `ready` que cumplan el canónico estricto, y SHALL incluir la duración de cada archivo (`duration`) en la playlist para que el demuxer mantenga timestamps continuos sin gaps. El sistema NO SHALL emitir tracks que no sean canónicos estrictos.

#### Scenario: Playlist con duraciones
- **WHEN** el sistema genera la playlist de emisión
- **THEN** cada entrada incluye su duración (`duration`) y la cabecera `ffconcat`
- **AND** el orden respeta el orden/shuffle configurado

#### Scenario: Track no conforme en la playlist
- **WHEN** un track del playlist no cumple el canónico estricto o no está `ready`
- **THEN** el sistema no lo emite, lo re-normaliza en background y lo excluye hasta que esté `ready`

### Requirement: Los segmentos HLS están alineados a keyframes
El sistema SHALL configurar la segmentación HLS de modo que los fragmentos se corten en keyframes y su duración sea regular (objetivo 2–3 s). Mientras el AutoDJ esté al aire, el manifiesto HLS SHALL actualizarse de forma continua y NO SHALL publicarse un `#EXT-X-ENDLIST`.

#### Scenario: Duración de segmentos regular
- **WHEN** el AutoDJ está transmitiendo
- **THEN** los segmentos `.ts` tienen una duración acotada y regular (no fragmentos gigantes por GOP grande)
- **AND** el manifiesto agrega segmentos nuevos de forma periódica

#### Scenario: El manifiesto no queda stale
- **WHEN** el AutoDJ lleva varios minutos al aire
- **THEN** el `.m3u8` sigue creciendo/rotando y no incluye `#EXT-X-ENDLIST`

### Requirement: Verificación de conformidad y soak del stream
El sistema SHALL proveer una verificación de conformidad que compare todos los archivos del playlist (resolución, fps, SAR, códec, pixel format y audio) y falle si alguno difiere, y una prueba de soak que reproduzca el AutoDJ durante un período configurable comprobando que no hay cortes ni estancamiento.

#### Scenario: Verificación de un playlist heterogéneo
- **WHEN** se ejecuta la verificación sobre un playlist con videos de distinta resolución o fps
- **THEN** la verificación falla y reporta el archivo no conforme

#### Scenario: Soak sin cortes
- **WHEN** se ejecuta el soak sobre un AutoDJ con playlist conforme
- **THEN** durante toda la ventana de prueba el HLS sigue produciendo segmentos y el video avanza sin estancarse
