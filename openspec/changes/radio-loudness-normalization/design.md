# Design

## Context

Ver `proposal.md` — Why. El generador de scripts de Liquidsoap ya envuelve cada `input.harbor` con `blank.detect` para el fallback por silencio, pero no aplica ningún control de volumen. El TTS del panel se post-procesa con `loudnorm I=-16`, mientras que las locuciones automáticas del agente se escriben crudas y la música no se toca.

## Decisions

### 1. `normalize(lufs=true, target=-16.0)` por fuente

Liquidsoap 2.4.5 incluye el operador `normalize` con soporte LUFS. Se aplica antes del `fallback`/`rotate` a:

- playlist de música,
- playlist de jingles,
- playlist de intros IA,
- `request.queue` de locuciones.

Parámetros: `target=-16.0`, `track_sensitive=true`, `window=1.0`, `up=5.0`, `down=2.0`. El objetivo coincide con el post-proceso de TTS (`loudnorm=I=-16`) para que no haya diferencia entre proveedores.

### 2. No se normaliza el harbor del DJ en vivo

El DJ envía su propia mezcla; aplicar AGC dinámico a una fuente live puede bombear. Se deja fuera para no degradar la operación en vivo. Si se necesita, se puede agregar después con `track_sensitive=false`.

### 3. Sin re-encodeo de archivos

La nivelación ocurre en el flujo de Liquidsoap, no en los MP3. No se toca la biblioteca, los tags ni las carátulas.

## Risks / Trade-offs

- [AGC dinámico puede bombear en temas muy dinámicos] → `track_sensitive=true` y ventana de 1 s; si molesta, se puede bajar `up/down`.
- [CPU adicional por cliente] → Cuatro fuentes normalizadas; el agente ya corre Liquidsoap por cliente.
- [Nodos viejos] → Requiere **"Actualizar nodo"** y reiniciar streams para regenerar los `.liq`.

## Migration Plan

1. Deploy del agente.
2. Pulsar **"Actualizar nodo"** en cada nodo remoto.
3. Reiniciar los streams para regenerar los scripts `.liq`.
4. Verificar un corte de música → hora/clima y un tema con locución.
