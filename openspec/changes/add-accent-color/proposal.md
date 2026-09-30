# Proposal

## Why

El sitio web de cada radio/TV (PWA) ya lee `selectedTemplate` desde `GET /api/public/{clientId}` y elige el diseño del cliente, pero cada medio no puede definir un color de acento propio para su marca. Se necesita que el panel permita fijar un color destacado por cliente y que la API pública lo exponga en runtime, sin recompilar el sitio.

## What Changes

- **Modelo `Client`** — se agrega la columna nullable `accentColor` (`String?`). Clientes existentes quedan en `null`. Se aplica vía `prisma db push` en el deploy (sin migración manual de datos).
- **Normalización compartida** — helper único que acepta `#RRGGBB` (mayúsculas o minúsculas) y devuelve el valor en minúsculas; cualquier otro valor (incluido `""`) devuelve `null`. Sin paleta fija y sin alpha.
- **Selección del color en la activación** — en `/dashboard/template`, al pulsar "Seleccionar Plantilla" se abre un modal donde se elige el color destacado antes de confirmar. El guardado es **atómico**: `templateId` + `accentColor` en un solo `POST`.
  - **Tarjeta activa**: el botón pasa a "Color destacado" y reabre el mismo modal con la plantilla fija, reenviando el mismo `templateId` para cambiar solo el color.
  - **Precarga**: el modal arranca con el `accentColor` actual del cliente si existe; si no, en `null`.
  - El modal ofrece color picker, campo hex y botón "Usar color de la plantilla" (guarda `null`).
- **Guardado del panel** — `POST /api/dashboard/templates` acepta `accentColor` opcional junto a `templateId` y persiste ambos en un solo `update`. Retrocompatible: si el payload no trae `accentColor`, no se modifica el color existente.
- **Exposición pública** — `GET /api/public/{clientId}` agrega `accentColor: string | null` como campo **raíz hermano de `selectedTemplate`**, leído directo del `Client` y normalizado en lectura (valor inválido guardado → `null`). No se modifican ni renombran campos existentes y CORS/respuesta JSON quedan igual. No se toca `getPublicBasicData` ni `/basic-data`.
- **Docs** — actualizar `instruccionesapi.md` (§1, tabla de campos raíz) con el nuevo campo.

**Non-goals:** no se expone el color en `/basic-data`; no se agrega color a las plantillas (`Template`); no se validan colores contra una paleta.

## Capabilities

### New Capabilities

- `public-api/accent-color`: exponer el color destacado configurado por cliente como campo raíz de la API pública no autenticada, normalizado y consistente con el contrato existente.
- `dashboard/accent-color`: elegir y persistir el color destacado de un cliente en el momento de activar (o reconfigurar) su plantilla desde el panel.

### Modified Capabilities

- Ninguna: no existe spec previa sobre la plantilla/color del sitio del cliente; el comportamiento nuevo queda contenido en las dos capacidades nuevas.

## Impact

- **Datos** — `prisma/schema.prisma`: `Client.accentColor String?` (se sincroniza con `prisma db push` en el deploy).
- **Lib** — `lib/accent-color.ts` (nuevo): `normalizeAccentColor`; `lib/validations.ts`: schema de `accentColor`.
- **API panel** — `app/api/dashboard/templates/route.ts`: acepta `accentColor` opcional y lo persiste atómicamente con `templateId`.
- **API pública** — `app/api/public/[clientId]/route.ts`: agrega `accentColor` raíz.
- **UI dashboard** — `components/dashboard/TemplateSelector.tsx` y nuevo modal de activación con picker/hex/reset; `app/dashboard/template/page.tsx` precarga el color actual.
- **Docs** — `instruccionesapi.md`.
- **Deploy** — solo toca el panel (no `streaming/agent/*`): no requiere pulsar **"Actualizar nodo"** en nodos remotos.
