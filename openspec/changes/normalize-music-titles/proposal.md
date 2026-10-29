# Proposal

## Why

Los archivos que suben los clientes suelen traer nombres de artista y título contaminados con numeración de pista, sufijos de descarga (`(Official Video)`, `[HD]`, `320kbps`) y separadores de archivo. El locutor IA toma esos textos para generar las introducciones del AutoDJ, así que una locución puede terminar leyendo "track 01 official video hd" en vez del nombre real del tema. Hoy no hay forma de limpiar la biblioteca existente sin editar tema por tema.

## What Changes

- Al subir una pista a la biblioteca de música del cliente, el agente normaliza automáticamente el **artista** y el **título** antes de guardarlos: elimina numeración de pista, artefactos de nombre de archivo y sufijos/versiones entre paréntesis o corchetes.
- La limpieza se aplica sobre el valor final (tag ID3 o, si falta, nombre de archivo), sin agregar texto ni números que no estaban.
- Se agrega un botón **"Normalizar título"** en la biblioteca de música (`/dashboard/streaming/library`) que ejecuta la misma rutina sobre los temas seleccionados; si no hay selección, procesa toda la biblioteca del cliente.
- El botón informa cuántos temas se normalizaron, cuántos quedaron igual y cuántos fallaron.
- La normalización es idempotente: correrla dos veces no cambia un nombre ya limpio.
- No se renombran archivos en disco ni se modifican tags ID3; solo cambia el título/artista visible en la base de datos y, por lo tanto, lo que usa el locutor IA.

## Capabilities

### New Capabilities

- `radio/music-library-metadata`: normalización automática de artista/título al subir música y normalización manual por lote desde la biblioteca del cliente.

### Modified Capabilities

<!-- Ninguna: no existía una capability que cubriera la metadata de la biblioteca de radio. -->

## Impact

- Agente de streaming: `streaming/agent/lib/id3.js` (o helper nuevo), `streaming/agent/routes/library.js`, tests del agente.
- Panel: `lib/streaming-client.ts`, nueva ruta `app/api/dashboard/streaming/library/normalize/route.ts`, `app/dashboard/streaming/library/page.tsx`, textos en `lib/dashboard-i18n.ts`.
- Operación: tocar `streaming/agent/*` obliga a pulsar **"Actualizar nodo"** en cada nodo remoto después del deploy.
- Sin cambios de esquema de base de datos ni dependencias nuevas.
