# Spec Delta

## Purpose

Reduce la carga que genera el contenido público (espectadores de la PWA) cacheando en proceso las respuestas read-only con un TTL corto, manteniendo la frescura mediante invalidación al escribir.

## ADDED Requirements

### Requirement: Caché de contenido público read-only
El sistema SHALL cachear en proceso las respuestas GET de contenido público read-only durante un TTL corto configurable, de modo que requests repetidos dentro del TTL no recomputen la respuesta contra la base de datos.

#### Scenario: Request repetido dentro del TTL
- **WHEN** llega una request GET al mismo contenido público del mismo cliente dentro del TTL
- **THEN** el sistema responde desde la caché sin recomputar contra la base de datos

#### Scenario: TTL configurable y desactivable
- **WHEN** `PUBLIC_CONTENT_CACHE_TTL_MS` es `0`
- **THEN** el sistema no cachea y cada request se resuelve normalmente

### Requirement: Frescura e invalidación al escribir
El sistema SHALL invalidar la caché del cliente al crear, editar o borrar contenido, de modo que el contenido nuevo quede disponible sin esperar el vencimiento del TTL; en los demás procesos del cluster la actualización se refleja a más tardar dentro del TTL.

#### Scenario: Contenido nuevo visible
- **WHEN** un cliente crea una noticia (o edita cualquier contenido)
- **THEN** la siguiente lectura de ese contenido no sirve una versión anterior al cambio

#### Scenario: Propagación entre procesos
- **WHEN** otro proceso worker sirve una lectura poco después de la escritura
- **THEN** la sirve actualizada a más tardar al vencer el TTL

### Requirement: Contenido dinámico o por-usuario sin caché
El sistema MUST NOT cachear contenido que depende de estado vivo o de identidad (chat, "ahora suena", votos, programación actual) ni las escrituras.

#### Scenario: Estado vivo no se cachea
- **WHEN** un consumidor pide el estado de streaming o el chat en línea
- **THEN** la respuesta no proviene de la caché de contenido público
