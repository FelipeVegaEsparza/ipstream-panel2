## Context

Ver proposal.md (Why) y la spec. Estado relevante del código:

- `lib/streaming-helpers.ts:getClientStreamUrls()` deriva ambas URLs: radio exige `radioStream` + base; video **solo** exige la base pública del servidor (`getVideoPublicBase` cae al servidor default aunque el cliente no tenga `VideoStream`). → `videoStreamingUrl` sale no-null para clientes sin TV.
- `lib/streaming-helpers.ts:rewriteClientPublicUrls()` persiste el mismo par de URLs en `BasicData` (usado en migraciones y al guardar datos básicos); replica la misma asimetría.
- La fuente de verdad de "qué incluye el plan" es `Client.plan.services` (`radio` | `tv` | `both`, default `both`), la misma que usa el panel para el menú (`lib/menu-permissions.ts`). El reproductor consume `GET /api/public/{clientId}/basic-data`, que ya sobreescribe `radioStreamingUrl`/`videoStreamingUrl` con el helper derivado.

## Goals / Non-Goals

**Goals:**
- Que el reproductor deje de mostrar TV cuando el plan es solo-radio (y radio cuando el plan es solo-TV), con o sin streams sobrantes de un downgrade.
- Exponer el contrato `services` en la API pública de datos básicos para decisiones futuras del reproductor.
- Mantener el plan como fuente de verdad, consistente con el menú del panel.

**Non-Goals:**
- No cambiar el esquema de BD ni `Plan.services`.
- No tocar el código del reproductor (repo externo): la corrección de URLs basta para cortar el síntoma; `services` es el contrato para que el reproductor migre cuando quiera.
- No eliminar `VideoStream`/`RadioStream` sobrantes en downgrades (eso es un problema de datos/gestión de planes aparte, fuera de alcance).

## Decisions

### 1. `getClientStreamUrls` gatea cada URL por plan + existencia del stream

Cargar el plan del cliente y aplicar la regla por servicio:

```ts
const client = await prisma.client.findUnique({
  where: { id: clientId },
  select: { plan: { select: { services: true } } },
})
const services = client?.plan?.services || 'both'

// radio: requiere stream Y plan radio/both
const radioStreamingUrl =
  services !== 'tv' && radioStream && radioBase
    ? `${radioBase.replace(/\/+$/, '')}/${radioStream.icecastMount}`
    : null

// video: requiere stream Y plan tv/both
const videoStreamingUrl =
  services !== 'radio' && videoStream && videoBase
    ? `${videoBase.replace(/\/+$/, '')}/live/${getVideoStreamKey(clientId)}.m3u8`
    : null
```

- Por qué gatear por **plan y no solo por stream**: el downgrade `both → radio` conserva la fila `VideoStream`; gatear por stream no bastaría (escenario de la spec). El plan es la fuente de verdad que ya usa el panel.
- El helper actual debe además leer la existencia del `VideoStream` (hoy no lo hace). Con `services !== 'radio'` + `videoStream` existente + `videoBase` → URL.
- Nota: `getVideoStreamKey(clientId)` debe seguir devolviendo un key derivado aunque no haya fila; se sigue llamando solo si `videoStream` existe (la condición ya lo protege).

### 2. `rewriteClientPublicUrls` aplica la misma regla

Para que lo persistido en `BasicData` no reintroduzca la asimetría (migraciones / guardado de datos básicos), replicar el mismo gate (plan + stream) al calcular `radioStreamingUrl` y `videoStreamingUrl`. Fallback a env solo cuando el servicio está habilitado.

- Por qué persistir también: `app/api/basic-data/route.ts` llama a `rewriteClientPublicUrls` al guardar; sin el gate, el valor persistido volvería a "inventar" la URL de video en el próximo read si el helper derivado no tuviera prioridad.

### 3. Exponer `services` en la respuesta pública de basic-data

En `app/api/public/[clientId]/basic-data/route.ts`, resolver `services` (del plan del cliente, default `both`) e incluirlo en la respuesta junto a las URLs. Se reutiliza la misma consulta del plan para no duplicar queries.

- Por qué en basic-data y no en el payload completo `/clientId`: el reproductor confirmó que lee todo desde basic-data; ese es el contrato mínimo a ampliar.

### Alternativa descartada

Exponer solo `services` y dejar la URL "inventada": el reproductor actual decide por presencia de URL, así que no cortaría el síntoma hasta que el reproductor migre. Por eso C = corregir URLs (síntoma ya) + contrato explícito (futuro).

## Risks / Trade-offs

- [Cliente con plan `radio` al que un admin le creó `VideoStream` a mano (setup custom)] → La TV dejará de mostrarse en el reproductor/dashboard aunque el stream exista. Aceptado: el plan manda, igual que en el menú del panel; el admin debe reflejar el servicio en el plan.
- [Fallback a env para radio en `rewriteClientPublicUrls` ya existente] → Se conserva pero solo cuando el plan incluye radio.
- [`getClientStreamUrls` ahora hace una query extra (plan)] → Irrelevante (1 lookup indexado por clientId, ya hay varios en el mismo endpoint).

## Migration Plan

- Solo código de panel; sin migración de BD. Deploy normal por GitHub Actions.
- Rollback: revertir el commit.
- Verificación post-deploy: consultar `GET /api/public/{clientId}/basic-data` de un cliente solo-radio → `services: "radio"` y `videoStreamingUrl: null`; de uno solo-TV → `radioStreamingUrl: null`; de uno both → ambas URLs y `services: "both"`. El reproductor deja de mostrar TV en clientes solo-radio.
- No aplica "Actualizar nodo" (no toca streaming-agent/scripts).
