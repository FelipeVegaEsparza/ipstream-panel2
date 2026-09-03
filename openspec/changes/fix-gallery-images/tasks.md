## 1. Crear galería con imágenes (POST /api/galleries)

- [x] 1.1 Modificar `app/api/galleries/route.ts` para que el POST construya el create sin esparcir `imageUrls` en el data de la galería y use nested create en `images` con `{ imageUrl, order: índice }`. Verificar que al crear una galería con N imágenes la respuesta es 2xx y la galería incluye las N filas ordenadas (y que ya no devuelve 500).
- [ ] 1.2 Verificar que el POST responde 400 (validación) si `imageUrls` viene vacío/ausente, sin crear filas ni galería.

## 2. Editar galería reemplazando imágenes (PUT /api/galleries/[id])

- [x] 2.1 Modificar el PUT en `app/api/galleries/[id]/route.ts` para actualizar `title`/`description` y reemplazar las filas de imagen en `$transaction` (deleteMany + createMany con `order` del índice del array). Verificar con `npm run lint` y `npm run build` que compila, y que editar una galería con el mismo payload no deja filas duplicadas.
- [ ] 2.2 Verificar que el PUT de una galería existente propia con subconjunto reordenado de imágenes deja la DB exactamente con ese subconjunto en el nuevo orden (consultar la galería vía GET tras el PUT).
- [ ] 2.3 Verificar que el PUT a una galería inexistente o de otro cliente responde 404 sin modificar nada.

## 3. Carga múltiple sin pérdida de imágenes (GalleryImageUpload)

- [x] 3.1 Reescribir en `components/dashboard/GalleryImageUpload.tsx` el manejo de selección/drop para procesar la tanda de archivos en serie y consolidar el estado: base snapshot + resultados acumulados, llamando a `onChange([...base, ...uploaded])` tras cada éxito. Verificar con `npm run lint` que compila.
- [ ] 3.2 Verificar manualmente que seleccionando/arrastrando N archivos a la vez, la grilla termina mostrando el conjunto previo + N imágenes (sin que se pisen), y que el orden refleja el de subida.
- [ ] 3.3 Verificar que si uno de N archivos falla se muestra el toast de error y las imágenes subidas se conservan en la grilla.

## 4. Verificación integral

- [ ] 4.1 Prueba end-to-end local: crear una galería con varias imágenes subidas en una sola tanda → guardar → redirigir al listado y confirmar en `/api/galleries` que la galería persiste con sus N imágenes ordenadas.
- [ ] 4.2 Prueba end-to-end de edición: editar esa galería quitando una imagen y reordenando el resto → guardar → confirmar por GET que la DB quedó exactamente con el payload (título, descripción e imágenes en orden).
- [ ] 4.3 Confirmar que ningún cambio toca streaming-agent/scripts y ejecutar `npm run lint` y `npm run build` en limpio antes de commitear.
