# Spec Delta

## Purpose

Mantiene limpios el artista y el título de las pistas de la biblioteca de radio para que el locutor IA y el AutoDJ anuncien nombres reales, sin numeración de pista ni sufijos de descarga.

## ADDED Requirements

### Requirement: Normalización automática al subir música

Al subir una pista a la biblioteca de música del cliente, el sistema SHALL normalizar el artista y el título antes de guardarlos, usando como entrada los tags del archivo y, si faltan, el nombre del archivo.

La normalización SHALL:

- Recortar espacios al inicio y al final y colapsar espacios repetidos.
- Quitar numeración de pista al inicio (`01`, `01.`, `01 -`, `[01]`, `(01)`).
- Convertir guiones bajos usados como separador en espacios.
- Quitar sufijos técnicos entre paréntesis o corchetes, sin distinguir mayúsculas: `official video`, `official audio`, `video oficial`, `videoclip`, `audio`, `lyric(s)`, `letra`, `con letra`, `hd`, `hq`, `4k`, `1080p`, `720p`, `320kbps`, `128kbps`, `kbps`, `mp3`, `descarga`, `download`, `gratis`, `youtube`, dominios y URLs.
- Quitar anotaciones de versión entre paréntesis o corchetes: `remix`, `mix`, `version`, `edit`, `remaster`, `extended`, `live`, `en vivo`, `en directo`, `acústico`, `acoustic`, `cover`, `feat. ...`, `ft. ...`, `gira`, `tour`, `session`, `demo`.
- Quitar tokens técnicos sueltos fuera de paréntesis: `HD`, `HQ`, `4K`, `1080`, `720`, `320kbps`, etc., y anotaciones finales como `Video oficial`, `Audio`, `Con letra`, `En vivo`.
- Quitar el nombre del artista del título cuando el título viene como `Artista - Tema`, `Tema - Artista` o `Artista ft. Invitado - Tema` y el artista ya tiene su propio campo.
- Quitar un año entre paréntesis al final del texto.
- Quitar guiones, puntos o guiones bajos sobrantes al inicio y al final.
- No agregar texto, números, prefijos ni sufijos que no estuvieran en el valor original.
- Conservar subtítulos entre paréntesis que no sean anotaciones, por ejemplo `(Tu Forma De Ser)`.

Si el resultado de la normalización queda vacío, el sistema SHALL conservar el valor original sin cambios.

#### Scenario: Tag ID3 con sufijo de descarga

- **WHEN** se sube un MP3 cuyo tag de título es `Mi Canción (Official Video) [HD]`
- **THEN** la pista se guarda con título `Mi Canción`
- **AND** el artista guardado no contiene sufijos técnicos agregados

#### Scenario: Nombre de archivo con numeración y guiones bajos

- **WHEN** se sube un MP3 sin tags cuyo archivo se llama `03_Mi_Banda_-_Otra_Canción.mp3`
- **THEN** la pista se guarda con título `Otra Canción`
- **AND** el artista se guarda como `Mi Banda`

#### Scenario: Anotación de versión

- **WHEN** se sube una pista con título `Tema Central (Remix) (2021)`
- **THEN** la pista se guarda con título `Tema Central`

#### Scenario: Anotación parentética de descarga

- **WHEN** se sube una pista con título `Vasos Vacíos (Remasterizado 2008)` o `Lunes Por La Madrugada (En Directo / Teatro Opera / 1985)`
- **THEN** la pista se guarda sin el contenido entre paréntesis

#### Scenario: Token técnico suelto

- **WHEN** se sube una pista con título `Turf - Pasos al costado HD` o `Tema 1080 HD`
- **THEN** la pista se guarda sin `HD` ni `1080`

#### Scenario: Artista repetido en el título

- **WHEN** se sube una pista con título `Viejas Locas - Me Gustas Mucho` y artista `Viejas Locas`
- **THEN** la pista se guarda con título `Me Gustas Mucho`
- **AND** el artista se conserva en su propio campo

#### Scenario: Título con formato tema - artista

- **WHEN** se sube una pista con título `Por Mil Noches - AIRBAG - Video oficial` y artista `AIRBAG`
- **THEN** la pista se guarda con título `Por Mil Noches`

#### Scenario: Subtítulo legítimo entre paréntesis

- **WHEN** se sube una pista con título `Loco (Tu Forma De Ser)`
- **THEN** el paréntesis se conserva porque no es una anotación técnica ni de versión

#### Scenario: Texto que ya está limpio

- **WHEN** se sube una pista con título `Como Ti` y artista `Camilo`
- **THEN** la pista se guarda con los mismos valores, sin alteraciones

#### Scenario: La limpieza no deja el nombre vacío

- **WHEN** el valor original es únicamente un sufijo técnico, por ejemplo `(Official Video)`
- **THEN** el sistema conserva el valor original en lugar de guardar un nombre vacío

### Requirement: Normalización manual desde la biblioteca

La biblioteca de música del cliente SHALL ofrecer un botón **"Normalizar título"** que aplique la misma rutina de normalización a los temas seleccionados. Si no hay temas seleccionados, el botón SHALL procesar todos los temas de la biblioteca del cliente.

El procesamiento SHALL ser idempotente: volver a ejecutarlo sobre temas ya normalizados no SHALL cambiar sus valores.

La operación SHALL informar al usuario cuántos temas se normalizaron, cuántos quedaron sin cambios y cuántos fallaron.

Un error al normalizar un tema SHALL NOT impedir que se procesen los demás temas.

#### Scenario: Normalizar selección

- **WHEN** el cliente selecciona tres temas y pulsa "Normalizar título"
- **THEN** solo esos tres temas se procesan
- **AND** la interfaz muestra el resumen con los conteos de normalizados, sin cambios y fallidos

#### Scenario: Normalizar toda la biblioteca

- **WHEN** el cliente no tiene temas seleccionados y pulsa "Normalizar título"
- **THEN** se procesan todos los temas de su biblioteca

#### Scenario: Segunda ejecución sin cambios

- **WHEN** el cliente ejecuta "Normalizar título" sobre temas que ya fueron normalizados
- **THEN** los títulos y artistas permanecen iguales
- **AND** el resumen indica que no hubo cambios

#### Scenario: Aislamiento de fallos

- **WHEN** un tema falla durante la normalización por lote
- **THEN** los demás temas seleccionados se siguen procesando
- **AND** el resumen incluye el tema fallido en el conteo de errores

### Requirement: Alcance de la normalización

La normalización SHALL modificar únicamente el artista y el título visibles de la pista. No SHALL renombrar archivos, alterar tags ID3, cambiar carátulas ni modificar la pertenencia a carpetas o playlists.

Los valores normalizados SHALL ser los usados por el locutor IA al generar introducciones.

#### Scenario: Archivos y relaciones intactos

- **WHEN** se normaliza un tema que pertenece a una carpeta y a una playlist
- **THEN** el archivo en disco conserva su nombre
- **AND** el tema sigue en la misma carpeta y playlist

#### Scenario: Introducción del locutor usa el nombre limpio

- **WHEN** el locutor IA genera una introducción para un tema normalizado
- **THEN** usa el título y artista normalizados, sin numeración ni sufijos técnicos
