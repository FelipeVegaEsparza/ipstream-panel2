# Spec Delta

## Purpose

Permite administrar un catálogo de voces ElevenLabs con hasta cuatro opciones femeninas y cuatro masculinas, y que cada cliente elija su locutor con una muestra de audio.

## ADDED Requirements

### Requirement: Catálogo ElevenLabs con género

El administrador SHALL poder configurar hasta 4 voces femeninas y 4 voces masculinas de ElevenLabs, cada una con nombre, voice ID y descripción opcional.

Las voces existentes sin género SHALL conservarse y mostrarse como “sin clasificar” hasta que el administrador les asigne un género. Las voces sin nombre o sin voice ID NO SHALL mostrarse al cliente.

#### Scenario: Agregar voces por género

- **WHEN** el administrador agrega una voz femenina o masculina
- **THEN** el catálogo la guarda con su género y la muestra en el grupo correspondiente
- **AND** no permite superar 4 voces por género

#### Scenario: Voz existente sin género

- **WHEN** el catálogo contiene una voz antigua sin `gender`
- **THEN** el administrador la ve en “Sin clasificar” y puede asignarle femenino o masculino

### Requirement: Selección de locutor por el cliente

El cliente SHALL ver las voces ElevenLabs agrupadas en femeninas y masculinas, con una opción de voz predeterminada y un botón de preview por voz.

La voz elegida SHALL guardarse en `RadioStream.aiVoiceId` y usarse en las locuciones y en el presentador del AutoDJ.

#### Scenario: Elegir una voz

- **WHEN** el cliente selecciona una voz femenina y guarda
- **THEN** el locutor IA usa esa voz en las próximas locuciones
- **AND** la selección se conserva al recargar la página

#### Scenario: Escuchar una muestra

- **WHEN** el cliente pulsa preview en una voz
- **THEN** escucha una muestra generada con esa voz y el proveedor activo

### Requirement: Preview multi-proveedor

El endpoint de preview SHALL generar la muestra con ElevenLabs cuando el proveedor activo sea ElevenLabs, y con Fish cuando sea Fish. La muestra NO SHALL consumir la cuota mensual de caracteres.

#### Scenario: Preview ElevenLabs

- **WHEN** el proveedor activo es ElevenLabs y el cliente pide una muestra
- **THEN** el endpoint responde audio MP3 de esa voz
- **AND** no registra consumo en `ai_tts_usage`
