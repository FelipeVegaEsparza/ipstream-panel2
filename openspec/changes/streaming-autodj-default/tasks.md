## 1. Asset de música por defecto

- [x] 1.1 Generar un MP3 corto (~30s) con loop musical simple e ID3 básico (título "Jingle de bienvenida", artista "IPStream") y guardarlo en `public/audio/default-jingle.mp3`.
- [x] 1.2 Verificar que el MP3 es un archivo de audio válido (audio/mpeg, tamaño razonable) y que queda versionado en el repo.

## 2. Endpoint admin de control del AutoDJ

- [x] 2.1 Crear `app/api/admin/streaming/[clientId]/autodj/route.ts` (POST solo ADMIN) que reciba `{ action: 'start' | 'stop' }`, valide que el cliente tenga RadioStream, llame a `streamingClient.start/stop(clientId)` y registre la acción en `StreamingAuditLog`.
- [x] 2.2 Manejar errores del agente (p.ej. "stream ya está corriendo" al iniciar, cliente sin RadioStream) devolviendo un mensaje claro al admin.

## 3. Botón Iniciar/Detener en /admin/streaming

- [x] 3.1 En `app/admin/streaming/page.tsx`, agregar un botón contextual por fila con RadioStream: "Detener" si `status` es `autodj`/`live`, "Iniciar" si está apagado.
- [x] 3.2 Conectar el botón al endpoint `/api/admin/streaming/[clientId]/autodj`, con estado de carga por cliente, toast de éxito/error y refresco de la lista tras la acción.

## 4. Siembra de contenido por defecto al crear cliente

- [x] 4.1 Crear helper `seedDefaultAutoDjContent(clientId)` (en `lib/streaming-helpers.ts` o `lib/streaming-seed.ts`) que sube el MP3 del asset al agente, crea la playlist "Playlist por defecto", agrega el track y la activa; protegido contra duplicados (omite si el cliente ya tiene tracks o playlist activa) y aislado en try/catch.
- [x] 4.2 Invocar `seedDefaultAutoDjContent` en `app/api/auth/register/route.ts` tras crear el RadioStream (dentro de try/catch aislado).
- [x] 4.3 Invocar `seedDefaultAutoDjContent` en `app/api/admin/users/route.ts` tras crear el RadioStream (dentro de try/catch aislado).

## 5. Verificación final

- [x] 5.1 Verificar en `/admin/streaming` que los botones Iniciar/Detener funcionan por cliente y que el estado se actualiza (y que un start cuando ya corre devuelve error claro).
- [x] 5.2 Verificar que al crear un cliente nuevo con plan de radio, su biblioteca queda con el tema por defecto y una playlist activa ("Playlist por defecto").
- [x] 5.3 Ejecutar lint/build (`npm run build` o `tsc --noEmit`) sin errores y revisar `openspec validate` del cambio.

## 6. Actualización de nodos ya provisionados

- [x] 6.1 Refactorizar `lib/node-provisioner.ts` para separar pasos reutilizables (código, config, stack) y agregar `startNodeUpdate(serverId)` que re-descarga el repo, copia `streaming`/compose, re-escribe `.env`/Caddyfile/override y levanta el stack con `--build` (estado `updating` → `done`).
- [x] 6.2 Crear endpoint `POST /api/admin/servers/[id]/update` (solo ADMIN) que dispara la actualización y rechaza si ya hay un job en curso o no hay acceso SSH.
- [x] 6.3 En `StreamingServersManager.tsx`, agregar botón "Actualizar nodo" (visible en nodos `done` con SSH), badge/estado "Actualizando" y polling mientras esté en curso.
- [x] 6.4 El update fuerza `--force-recreate` para refrescar los bind mounts (el `rm -rf streaming` cambia el inode del dir de scripts y liquidsoap quedaría con `/etc/liquidsoap/scripts` vacío).
- [x] 6.5 Auto-reinicio de streams tras actualizar un nodo: snapshot de los streams radio/TV activos (`autodj`/`live`) en ese servidor antes del update, y reinicio vía el agente después de levantar el stack (aislado, reporta fallos).
- [x] 6.6 Reemplazar el MP3 por defecto por música real de 30s (fade-in/out, ~ -0.9 dB pico), provista por el usuario, en `public/audio/default-jingle.mp3`.
