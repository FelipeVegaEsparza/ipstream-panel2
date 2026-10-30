# Tasks

## 1. Catálogo y API

- [x] 1.1 Extender `ElevenLabsVoiceOption` y `parseVoiceCatalog` con `gender`; verificar que entradas antiguas sin género siguen parseando.
- [x] 1.2 Validar en `app/api/admin/app-config/route.ts` máximo 4 femeninas + 4 masculinas y guardar `gender`; verificar con un PUT de prueba.

## 2. Administración

- [x] 2.1 Reemplazar la lista plana de voces por secciones femenina/masculina con contador `n/4` y botones de agregar.
- [x] 2.2 Mostrar voces sin género en “Sin clasificar” con selector para asignarlas; verificar guardado y recarga.

## 3. Cliente

- [x] 3.1 Extender `ai/config` para devolver `gender` en voces ElevenLabs y Fish.
- [x] 3.2 Reemplazar el `<select>` de ElevenLabs por tarjetas agrupadas con preview y selección; mantener expresividad/preset.
- [x] 3.3 Extender `voice-preview` para generar muestras con ElevenLabs sin consumir cuota.

## 4. Verificación y activación

- [x] 4.1 Ejecutar `npx tsc --noEmit`, `npm test` y `npx next build`.
- [ ] 4.2 Deployar, clasificar las voces existentes y activar `ttsProvider=elevenlabs`.
- [ ] 4.3 Probar preview y locución con una voz femenina y una masculina en producción.
