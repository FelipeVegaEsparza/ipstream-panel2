# Proposal

## Why

ElevenLabs ya tiene catálogo y selección por cliente, pero hoy es una lista plana sin género ni límite, y el cliente la ve como un `<select>` sin muestras. Fish Audio sí ofrece grupos masculino/femenino y preview, lo que hace la elección más clara. Además el proveedor activo en producción es Fish; queremos usar ElevenLabs como locutor principal.

## What Changes

- Extender el catálogo de voces ElevenLabs con `gender` (`male` / `female`).
- En `/admin/settings → Locución → ElevenLabs`, permitir configurar hasta **4 voces femeninas y 4 voces masculinas**, con nombre, voice ID y descripción.
- En `/dashboard/streaming/locutor-ia`, mostrar las voces ElevenLabs agrupadas por género, con preview de audio y selección por radio, igual que Fish.
- Extender el endpoint de preview para generar muestras con ElevenLabs además de Fish.
- Mantener compatibilidad con voces existentes sin género: aparecen como “sin clasificar” hasta que el admin las asigne.
- Activar ElevenLabs como proveedor principal en producción, dejando Fish como fallback.

## Capabilities

### New Capabilities

- `voice/elevenlabs-catalog`: catálogo de voces ElevenLabs con género, selección por cliente y preview.

### Modified Capabilities

<!-- Ninguna: no existía una capability de catálogo ElevenLabs. -->

## Impact

- Admin: `components/admin/ElevenLabsSettings.tsx`, `app/api/admin/app-config/route.ts`.
- Catálogo: `lib/elevenlabs-voices.ts`, `prisma/schema.prisma` (mismo campo JSON, sin migración).
- Cliente: `components/dashboard/streaming/locutor-ia/LocutorIaSettings.tsx`, `app/api/dashboard/streaming/ai/config/route.ts`.
- Preview: `app/api/dashboard/streaming/ai/voice-preview/route.ts`.
- Config de producción: `app_config.ttsProvider = elevenlabs` y clasificación de las voces existentes.
- Sin cambios de esquema SQL ni de dependencias.
