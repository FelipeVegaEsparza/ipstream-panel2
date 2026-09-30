# Design

## Context

Ver `proposal.md - Why`. Puntos del estado actual que condicionan el diseño:

- `Client.templateId` referencia a `Template`; la API pública **no** guarda `selectedTemplate`: lo deriva en `app/api/public/[clientId]/route.ts` (busca la plantilla y devuelve `template.name`).
- El panel elige plantilla en `components/dashboard/TemplateSelector.tsx` con guardado instantáneo: cada tarjeta hace `POST /api/dashboard/templates { templateId }`.
- Existe un serializador único de datos básicos (`lib/public-basic-data.ts`, `getPublicBasicData`) usado por `/basic-data` y por el payload completo. Este cambio **no lo toca**: el color es config del cliente, no dato básico.
- El `Modal` compartido (`components/ui/modal.tsx`) solo acepta `title`/`message`/botones, sin contenido personalizado.
- El deploy sincroniza el schema con `prisma db push --accept-data-loss` (aditivo), por lo que una columna nullable no requiere migración manual.
- Recordatorio del repo: no exponer `accentColor` en `/basic-data` (decisión del usuario: replicar exactamente la exposición de `selectedTemplate`, que solo vive en la raíz).

## Goals / Non-Goals

**Goals:**

- Persistir un color de acento libre nullable por cliente y exponerlo en la raíz de la API pública, normalizado y consistente.
- Elegir el color como parte de la activación de la plantilla (paso atómico), y poder reconfigurarlo después sobre la plantilla activa.
- Mantener intacto el contrato público existente y la retrocompatibilidad del `POST` de plantillas.

**Non-Goals:**

- Colores por plantilla (`Template`) o paletas predefinidas.
- Alpha/transparencias (el frontend las deriva).
- Cambios en `getPublicBasicData`, `/basic-data` o en el menú/permisos del panel.

## Decisions

### 1. Almacenamiento: `Client.accentColor String?`

Nullable, hermano de `templateId`, default efectivo `null`. Sin migración de datos.

- **Alternativa descartada:** `BasicData.accentColor`. Obligaría a upsert cuando el cliente no tiene fila `BasicData` y mezcla config del panel con datos del proyecto. Además, exponerlo exigiría pasar por `getPublicBasicData`, lo que lo anidaría dentro de `basicData`, contrario a la decisión de exponerlo solo en la raíz.

### 2. Exposición: campo raíz, igual que `selectedTemplate`

`GET /api/public/{clientId}` agrega `accentColor` como hermano de `selectedTemplate`, leído directo de `client.accentColor` y pasado por el normalizador en lectura. No se toca `getPublicBasicData`.

- **Alternativa descartada:** incluirlo en `basic-data` (spec original). El usuario pidió replicar exactamente la forma de `selectedTemplate`, que no aparece en datos básicos.

### 3. Normalización compartida, minúsculas

Nuevo `lib/accent-color.ts` con `normalizeAccentColor(value: unknown): string | null`:

- `null`/`undefined`/`""` → `null`.
- `#RRGGBB` (mayúsculas o minúsculas) → minúsculas con `#` (se tolera que falte el `#`).
- cualquier otra cosa (longitud distinta, alpha, texto) → `null`.

Se usa en la escritura (para normalizar) y en la lectura pública (defensa ante valores viejos/editados a mano). Un único helper evita divergencias entre panel y API.

### 4. Validación de escritura: rechazo explícito vs coerción

En el `POST`, si la clave `accentColor` viene presente, debe ser `null` o cumplir `#RRGGBB`; si no, `400`. No se coacciona silenciosamente a `null` en escritura (eso solo ocurre en lectura defensiva). En cliente, el hex inválido deshabilita "Activar".

### 5. Guardado atómico reutilizando `POST /api/dashboard/templates`

Se extiende el endpoint existente para aceptar `accentColor` opcional y persistir `{ templateId, accentColor }` en un solo `prisma.client.update`.

- **Retrocompatibilidad:** si la clave `accentColor` **no** está presente, el color existente no se modifica (el payload viejo `{ templateId }` sigue funcionando igual).
- **Alternativa descartada:** endpoint nuevo `/api/dashboard/accent-color`. No aporta nada si la activación siempre viaja junto al color; añade superficie y un segundo guardado.

### 6. UI: modal de activación dedicado y tarjeta activa reconfigurable

- Nuevo `components/dashboard/TemplateActivationModal.tsx` con color picker nativo, campo hex y botón "Usar color de la plantilla". Se evita tocar el `Modal` compartido (usado en muchas pantallas) añadiéndole un slot de contenido.
- **A1:** la tarjeta activa cambia su acción a "Color destacado" y reabre el mismo modal con la plantilla fija, reenviando el mismo `templateId` (evita un endpoint de color-only).
- **B2:** al abrir, se precarga `client.accentColor` actual; si es `null`, arranca en "Usar color de la plantilla". `app/dashboard/template/page.tsx` debe seleccionar y pasar el color actual.
- El `showModalMessage` existente en `TemplateSelector` se conserva para el feedback success/error.

### 7. Sin cambios en CORS, permisos ni menú

El `POST` mantiene el guard de menú `'template'` y `getEffectiveClient`; la API pública mantiene `createCorsResponse`. Solo se agrega un campo.

## Risks / Trade-offs

- **Duplicación del modal:** se crea un componente nuevo en vez de reutilizar `Modal`. Trade-off aceptado para no alterar un componente compartido.
- **Convención de caso:** normalizar a minúsculas cambia el string que el cliente escribió. Es intencional y estable; el sitio debe comparar sin importar caja.
- **Valor inválido ya persistido:** la lectura lo nulifica, así que el sitio nunca recibe un color roto; el operador debe volver a fijarlo.
- **Pérdida de color al cambiar de plantilla:** mitigado por B2 (precarga del color actual). Si el cliente quiere el color de la nueva plantilla, usa "Usar color de la plantilla".
- **`prisma db push` en prod:** la columna es aditiva y nullable; sin riesgo de pérdida de datos.

## Migration Plan

1. Editar `prisma/schema.prisma` (`Client.accentColor String?`).
2. Desplegar: GitHub Actions actualiza el panel; `docker-entrypoint.sh` aplica `prisma db push` y crea la columna.
3. Rollback: revertir el deploy; la columna puede quedar sin uso (nullable, sin efecto).
4. Solo panel → **no** requiere pulsar "Actualizar nodo" en nodos de streaming remotos.

## Open Questions

Ninguna: los puntos que afectaban spec/alcance (dónde se expone, caja de normalización, dónde se edita el color) ya quedaron resueltos.
