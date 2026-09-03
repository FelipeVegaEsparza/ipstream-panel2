## Purpose

La API pública de datos básicos (`basic-data`) de cada cliente expresa qué servicios de streaming incluye su plan, tanto con un campo explícito `services` como garantizando que `radioStreamingUrl`/`videoStreamingUrl` solo sean no-null cuando ese servicio está habilitado, para que el reproductor/sitio público no muestre secciones que el plan no incluye.

## ADDED Requirements

### Requirement: El contrato de servicios del cliente se expone en basic-data

`GET /api/public/{clientId}/basic-data` SHALL incluir en su respuesta un campo `services` con uno de los valores `radio`, `tv` o `both`, correspondiente a los servicios del plan activo del cliente. Si el cliente no tiene plan asignado, el sistema SHALL devolver `both` (fail-open, consistente con el panel).

#### Scenario: Cliente con plan solo-radio

- **WHEN** un cliente cuyo plan tiene `services = "radio"` consulta `GET /api/public/{clientId}/basic-data`
- **THEN** la respuesta incluye `services: "radio"`

#### Scenario: Cliente con plan de TV

- **WHEN** un cliente cuyo plan tiene `services = "tv"` consulta el endpoint
- **THEN** la respuesta incluye `services: "tv"`

#### Scenario: Cliente con plan radio+tv

- **WHEN** un cliente cuyo plan tiene `services = "both"` consulta el endpoint
- **THEN** la respuesta incluye `services: "both"`

#### Scenario: Cliente sin plan

- **WHEN** un cliente sin plan asignado consulta el endpoint
- **THEN** la respuesta incluye `services: "both"`

### Requirement: Las URLs de streaming reflejan los servicios habilitados

El sistema SHALL retornar `videoStreamingUrl` como `null` cuando el cliente no tenga un `VideoStream` **o** su plan no incluya TV. De igual forma, SHALL retornar `radioStreamingUrl` como `null` cuando el cliente no tenga un `RadioStream` **o** su plan no incluya radio. Solo se retorna una URL no-null cuando el servicio está habilitado por el plan y el stream existe.

#### Scenario: Plan solo-radio sin VideoStream

- **WHEN** un cliente con plan `radio` (sin `VideoStream`) consulta `basic-data`
- **THEN** `radioStreamingUrl` es la URL real del `RadioStream`
- **AND** `videoStreamingUrl` es `null`

#### Scenario: Downgrade de radio+tv a solo-radio conserva el VideoStream

- **WHEN** un cliente cuyo plan pasó a `radio` conserva una fila `VideoStream` de cuando tenía `both`
- **THEN** `videoStreamingUrl` es `null` aunque la fila `VideoStream` exista, porque el plan ya no incluye TV

#### Scenario: Plan radio+tv con ambos streams

- **WHEN** un cliente con plan `both` tiene `RadioStream` y `VideoStream`
- **THEN** `radioStreamingUrl` y `videoStreamingUrl` son ambas no-null y apuntan a sus streams reales

#### Scenario: Plan TV sin RadioStream

- **WHEN** un cliente con plan `tv` (sin `RadioStream`) consulta `basic-data`
- **THEN** `videoStreamingUrl` es la URL real del `VideoStream`
- **AND** `radioStreamingUrl` es `null`

#### Scenario: Endpoint dashboard de datos básicos

- **WHEN** un cliente consulta su propia data básica desde el dashboard (rutas que consumen la misma derivación de URLs)
- **THEN** las URLs de streaming siguen la misma regla de nulabilidad según plan y streams existentes
