# Spec Delta

## Purpose

Mantiene un nivel de volumen consistente entre la música y las locuciones del AutoDJ para que hora, clima, presentador y temas no salten de loudness.

## ADDED Requirements

### Requirement: Nivelación de fuentes del AutoDJ

El script de Liquidsoap SHALL normalizar a -16 LUFS, antes de mezclar, la música de playlist, los jingles, las intros del presentador IA y las locuciones de hora/clima.

La normalización SHALL ser por track para no arrastrar el nivel de una canción al siguiente corte.

#### Scenario: Música y locución

- **WHEN** suena una canción y luego una locución
- **THEN** ambas salen al mismo loudness objetivo y no hay un salto audible de volumen

#### Scenario: Hora o clima

- **WHEN** el agente encola una locución automática de hora o clima
- **THEN** la locución se normaliza antes de entrar al fallback del AutoDJ

### Requirement: Compatibilidad con el TTS existente

La normalización SHALL convivir con el post-proceso de TTS del panel y con el fallback ElevenLabs/Fish, sin alterar archivos ni tags.

#### Scenario: TTS ya normalizado

- **WHEN** una locución ya viene normalizada desde el panel
- **THEN** el paso de Liquidsoap la mantiene en el mismo objetivo sin recortes
