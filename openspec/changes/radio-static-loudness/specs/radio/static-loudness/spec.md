# Spec Delta

## Purpose

Define la nivelación estática por track para que música, jingles y locuciones mantengan un volumen estable de principio a fin, sin bombeo dinámico.

## ADDED Requirements

### Requirement: Ganancia estática por track

Cada archivo de audio de la biblioteca SHALL tener una medición de loudness integrada y una ganancia estática calculada para llegar a -16 LUFS.

La reproducción SHALL aplicar esa ganancia constante durante todo el track y NO SHALL usar control automático de ganancia dentro del tema.

#### Scenario: Tema con intro suave y estribillo fuerte

- **WHEN** suena un tema con cambios internos de energía
- **THEN** la ganancia aplicada permanece constante y el volumen percibido no sube ni baja dentro del tema

#### Scenario: Tema sin medición

- **WHEN** un archivo no tiene ganancia medida
- **THEN** el sistema lo reproduce sin AGC y lo reporta para el proceso de nivelación

### Requirement: Nivelación de la biblioteca existente

El sistema SHALL ofrecer un proceso batch para medir y etiquetar los tracks existentes sin re-encodear el audio.

#### Scenario: Backfill de un cliente

- **WHEN** se ejecuta el batch para un cliente
- **THEN** los tracks sin medición reciben su ganancia estática y quedan listos para `normalize_track_gain`

### Requirement: Locuciones estables

El TTS del panel y del agente SHALL normalizarse con ganancia estática medida y limitador de picos, sin `loudnorm` dinámico dentro de la locución.

#### Scenario: Locución con pausas

- **WHEN** una locución tiene pausas o cambios de énfasis
- **THEN** el volumen no fluctúa durante la locución
- **AND** los picos quedan limitados a -1.5 dBTP

### Requirement: Sin cambios en la biblioteca

La nivelación SHALL conservar el audio original, los tags existentes y las carátulas. NO SHALL re-encodear los MP3 de música.

#### Scenario: Etiquetado de un MP3

- **WHEN** se mide un MP3 existente
- **THEN** solo se agregan metadatos de ganancia y el audio no se re-encodea
