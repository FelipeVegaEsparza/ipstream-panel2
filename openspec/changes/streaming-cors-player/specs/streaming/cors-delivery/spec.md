## Purpose

Garantiza que las respuestas de streaming (audio de radio vía Icecast y video en vivo vía HLS/SRS) incluyan headers CORS, para que los reproductores y sitios web de los clientes puedan consumir los streams cross-origin desde el navegador (Web Audio, players de video).

## ADDED Requirements

### Requirement: Las respuestas de audio de Icecast incluyen CORS
El sistema SHALL incluir `Access-Control-Allow-Origin: *` en las respuestas HTTP de los streams de audio servidos por Icecast, de forma que cualquier origen pueda consumir el stream desde el navegador.

#### Scenario: Navegador consume un stream de audio cross-origin
- **WHEN** un reproductor en un sitio de un cliente solicita un stream de audio de Icecast con header `Origin`
- **THEN** la respuesta incluye `Access-Control-Allow-Origin: *`
- **AND** la respuesta incluye `Access-Control-Allow-Headers` que permita `Icy-MetaData`
- **AND** la respuesta incluye `Access-Control-Expose-Headers` que exponga `Icy-Br`, `Icy-MetaInt` e `Icy-MetaData`

#### Scenario: Acceso directo al puerto de Icecast sin proxy
- **WHEN** un reproductor accede al stream de audio directamente en el puerto de Icecast de un nodo (sin Caddy/proxy por delante)
- **THEN** la respuesta incluye igualmente los headers CORS, porque se definen en la config de Icecast

### Requirement: Los headers CORS se aplican a todos los mounts
El sistema SHALL aplicar los headers CORS de audio a todas las respuestas de todos los mounts de radio configurados en Icecast, incluyendo los generados dinámicamente por el agente.

#### Scenario: Mount generado por el agente con CORS
- **WHEN** el agente genera y deploya la config de Icecast con los mounts por cliente
- **THEN** cada respuesta de los streams de esos mounts incluye los headers CORS

#### Scenario: Config base de la imagen Icecast
- **WHEN** se construye un contenedor Icecast nuevo con el template base
- **THEN** su config incluye los headers CORS desde el arranque

### Requirement: Las respuestas HLS de video incluyen CORS
El sistema SHALL incluir `Access-Control-Allow-Origin: *` en las respuestas de manifiestos HLS (`.m3u8`) y segmentos de video servidos para televisión, para permitir su consumo cross-origin.

#### Scenario: Player consume HLS de TV desde el sitio del cliente
- **WHEN** un player en un sitio de un cliente solicita un manifiesto `.m3u8` de TV con header `Origin`
- **THEN** la respuesta incluye `Access-Control-Allow-Origin: *`

#### Scenario: Segmentos de video HLS
- **WHEN** el player solicita los segmentos (`.ts`) referenciados por el manifiesto HLS
- **THEN** las respuestas incluyen los headers CORS correspondientes

### Requirement: Los proxies del panel y de nodos no quitan CORS
El sistema SHALL asegurar que los proxies por delante de los streams (Caddy del panel para `/live/*`, `/dj/*` y `stream.*`; Caddy de los nodos) no eliminen los headers CORS y los agreguen cuando el origen stream no los provee.

#### Scenario: Caddy del panel sirve HLS
- **WHEN** una petición cross-origin llega a `/live/*` o `/dj/*` del panel
- **THEN** Caddy responde con `Access-Control-Allow-Origin: *`

#### Scenario: Caddy de un nodo sirve audio
- **WHEN** una petición cross-origin llega al dominio público de un nodo que proxya a Icecast
- **THEN** la respuesta incluye los headers CORS (agregados por Caddy y/o por Icecast)
