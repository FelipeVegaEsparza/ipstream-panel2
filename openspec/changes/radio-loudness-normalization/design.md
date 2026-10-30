# Design

## Context

Ver `proposal.md` — Why. El generador de scripts de Liquidsoap ya envuelve cada `input.harbor` con `blank.detect` para el fallback por silencio, pero no aplica ningún control de volumen. El TTS del panel se post-procesa con `loudnorm I=-16`, mientras que las locuciones automáticas del agente se escriben crudas y la música no se toca.

## Decisions

### 1. AGC lento solo para música y jingles

Liquidsoap 2.4.5 incluye `normalize` con soporte LUFS. Se aplica antes del `fallback`/`rotate` a la playlist de música y a la de jingles con parámetros lentos: `target=-16.0`, `track_sensitive=true`, `window=30.0`, `up=0.3`, `down=0.3`, `threshold=-35.0`, `gain_min=-12`, `gain_max=12`.

Las intros IA y las locuciones de hora/clima **no** pasan por AGC en Liquidsoap: son TTS y se normalizan con ganancia estática en su post-proceso. Así se evita el bombeo dentro de una locución.

### 2. No se normaliza el harbor del DJ en vivo

El DJ envía su propia mezcla; aplicar AGC dinámico a una fuente live puede bombear. Se deja fuera para no degradar la operación en vivo. Si se necesita, se puede agregar después con `track_sensitive=false`.

### 3. Ganancia estática para el TTS del agente

El agente mide la loudness integrada del TTS de hora/clima con `loudnorm` y aplica una ganancia fija hasta -16 LUFS + limitador. No usa AGC dinámico, por lo que el volumen de una locución no sube y baja mientras habla. El post-proceso del panel ya hacía algo equivalente para las locuciones generadas desde la consola.

### 4. Sin re-encodeo de la biblioteca

La nivelación de música/jingles ocurre en el flujo de Liquidsoap. No se re-encodean los MP3 ni se tocan tags o carátulas.

## Risks / Trade-offs

- [AGC dinámico puede bombear en temas muy dinámicos] → `track_sensitive=true` y ventana de 1 s; si molesta, se puede bajar `up/down`.
- [CPU adicional por cliente] → Cuatro fuentes normalizadas; el agente ya corre Liquidsoap por cliente.
- [Nodos viejos] → Requiere **"Actualizar nodo"** y reiniciar streams para regenerar los `.liq`.

## Migration Plan

1. Deploy del agente.
2. Pulsar **"Actualizar nodo"** en cada nodo remoto.
3. Reiniciar los streams para regenerar los scripts `.liq`.
4. Verificar un corte de música → hora/clima y un tema con locución.
