# Spec Delta

## Purpose

Define la calidad, pronunciación, mezcla y consumo de créditos de las locuciones y jingles generados con ElevenLabs, sin aumentar los caracteres facturables, la duración de música ni las llamadas al proveedor.

## ADDED Requirements

### Requirement: Presets de calidad de voz

El sistema SHALL ofrecer presets de calidad (natural, estable y expresiva) que ajusten `stability`, `similarity_boost`, `style`, `use_speaker_boost` y, cuando el modelo lo soporte, `speed`. El preset por defecto SHALL ser al menos tan claro como la configuración actual. Un cliente sin preset guardado SHALL heredar el preset global sin requerir migración manual.

#### Scenario: Cliente sin configuración

- **WHEN** un cliente no tiene preset de calidad guardado
- **THEN** usa el preset global por defecto sin cambiar su voz ni su plan

#### Scenario: Cambio de preset

- **WHEN** el administrador o el cliente elige otro preset
- **THEN** la siguiente locución generada usa los nuevos ajustes de voz
- **AND** el resto de la configuración de la emisora no cambia

#### Scenario: Modelo sin soporte de un ajuste

- **WHEN** el modelo seleccionado no soporta un ajuste opcional como `speed`
- **THEN** el sistema lo omite y genera el audio con el resto de los ajustes

### Requirement: Formato de audio de alta calidad

El sistema SHALL solicitar a ElevenLabs el formato de mayor calidad compatible con el modelo cuando esté disponible. Si el proveedor rechaza ese formato, SHALL reintentar con el formato actual para no romper la generación. El audio final guardado SHALL conservar una calidad igual o superior a la actual. El formato NO SHALL alterar el texto enviado ni el modelo seleccionado.

#### Scenario: Formato de alta calidad aceptado

- **WHEN** el proveedor acepta el formato de alta calidad
- **THEN** el audio guardado tiene mayor fidelidad que el MP3 128 actual

#### Scenario: Formato rechazado

- **WHEN** el proveedor rechaza el formato de alta calidad
- **THEN** el sistema reintenta con el formato anterior y entrega el audio sin fallar

#### Scenario: Sin cambios en el texto

- **WHEN** se solicita un formato de mayor calidad
- **THEN** el texto enviado y la cantidad de caracteres facturables son los mismos que antes

### Requirement: Post-proceso de voz

El audio de locución SHALL pasar por un post-proceso que reduzca ruido de baja frecuencia, realce la presencia de la voz, controle dinámica y normalice loudness con limitador. El post-proceso NO SHALL agregar llamadas a ElevenLabs ni caracteres facturables.

#### Scenario: Locución post-procesada

- **WHEN** se genera una locución
- **THEN** el archivo final tiene un nivel de loudness consistente y sin clipping

#### Scenario: Fallo del post-proceso

- **WHEN** el post-proceso falla
- **THEN** se entrega el audio original generado por ElevenLabs sin bloquear la función

### Requirement: Pronunciación controlada sin costo extra

El sistema SHALL permitir controlar la pronunciación de marcas, siglas y palabras en inglés. SHALL usar el diccionario de pronunciación del proveedor cuando esté disponible. Si se usa reemplazo fonético, el texto enviado a ElevenLabs NO SHALL superar la longitud del texto original facturado. La pronunciación NO SHALL agregar caracteres al consumo del cliente.

#### Scenario: Marca con pronunciación controlada

- **WHEN** una locución contiene una marca o palabra en inglés
- **THEN** se aplica la pronunciación configurada sin ejecutar una llamada adicional

#### Scenario: Reemplazo más largo que el original

- **WHEN** un reemplazo fonético supera la longitud del texto original
- **THEN** el sistema no lo usa y conserva el texto facturable original

#### Scenario: Diccionario no disponible

- **WHEN** el modelo o la cuenta no soportan diccionario de pronunciación
- **THEN** se usa el texto original con `language_code` en español y sin aumentar créditos

### Requirement: Mezcla de jingles y cápsulas

La mezcla de jingles y cápsulas SHALL aplicar ducking de la música bajo la voz, separar el tratamiento de voz y música, controlar dinámica y normalizar el resultado final. La duración de la música, el texto de la locución y las llamadas a ElevenLabs NO SHALL aumentar respecto del flujo actual.

#### Scenario: Jingle con música y voz

- **WHEN** se genera un jingle
- **THEN** la música baja de nivel mientras habla la voz y vuelve a subir en los silencios
- **AND** el resultado final no tiene clipping

#### Scenario: Cápsula con cama musical

- **WHEN** se genera una cápsula con música de fondo
- **THEN** la voz se entiende por encima de la música y el nivel final es consistente

#### Scenario: Misma duración y texto

- **WHEN** se aplica la nueva mezcla
- **THEN** se consume la misma duración de música y la misma cantidad de caracteres que antes

### Requirement: Caché y consumo invariable

La clave de caché SHALL incluir modelo, voz, preset/ajustes, formato, idioma, texto y versión de post-proceso. Un cache hit NO SHALL llamar a ElevenLabs ni consumir caracteres o música. La mejora de calidad NO SHALL agregar llamadas, caracteres, duración de música ni cambiar el modelo por defecto.

#### Scenario: Cache hit con nueva calidad

- **WHEN** se solicita un texto ya generado con los mismos ajustes
- **THEN** se reutiliza el audio y no se descuentan créditos

#### Scenario: Cambio de preset

- **WHEN** cambia el preset o el formato
- **THEN** la clave de caché cambia y se genera una versión nueva con una sola llamada

#### Scenario: Comparación de consumo

- **WHEN** se compara una generación antes y después del cambio con el mismo texto
- **THEN** los contadores de caracteres y música no aumentan

### Requirement: Persistencia y compatibilidad

Los presets y ajustes SHALL persistir en la configuración global y, si aplica, por cliente. Los valores existentes NO SHALL romperse: un cliente sin preset nuevo SHALL seguir funcionando con los valores actuales y el modelo configurado.

#### Scenario: Cliente existente

- **WHEN** un cliente ya tenía voz y estilo configurados
- **THEN** sigue usando su voz y el sistema aplica el preset por defecto solo donde faltaba configuración

#### Scenario: Rollback

- **WHEN** se revierte la configuración de calidad
- **THEN** las locuciones vuelven a los ajustes anteriores sin perder audios cacheados
