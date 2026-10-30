# Proposal

## Why

Las fuentes del AutoDJ no comparten el mismo loudness: la música puede venir de discos con niveles distintos, el TTS del panel se normaliza a -16 LUFS y las locuciones automáticas del agente (hora/clima) salen sin post-proceso. El resultado es que un tema suena más fuerte que una locución o viceversa.

## What Changes

- Aplicar normalización de loudness **-16 LUFS** en Liquidsoap a cada fuente antes de mezclarla:
  - música de playlist,
  - jingles,
  - intros del presentador IA,
  - locuciones de hora/clima.
- Mantener el post-proceso de TTS del panel y el fallback de proveedor sin cambios.
- Agregar una prueba del script generado que verifica los normalizadores.
- No se re-encodean archivos ni se modifican volúmenes manuales del cliente.

## Capabilities

### New Capabilities

- `radio/loudness`: nivelación automática del volumen entre música y locuciones del AutoDJ.

### Modified Capabilities

<!-- Ninguna. -->

## Impact

- Agente: `streaming/agent/lib/script-generator.js` y tests.
- Nodos: requiere **"Actualizar nodo"** y reiniciar los streams para regenerar los `.liq`.
- Sin cambios de base de datos ni del panel.
