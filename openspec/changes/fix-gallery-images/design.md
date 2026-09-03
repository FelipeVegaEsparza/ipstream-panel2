## Context

Ver proposal.md (Why). Estado actual relevante:

- Las imágenes de una galería viven en la tabla `gallery_images` (`GalleryImage { galleryId, imageUrl, order }`) con relación `Gallery.images`. El modelo `Gallery` **no** tiene campo `imageUrls`.
- El payload del formulario (validado por `gallerySchema`) es `{ title, description, imageUrls: string[] }`, donde el orden del array es el orden de la galería.
- `POST /api/galleries` y `PUT /api/galleries/[id]` mandan ese payload directo a `prisma.gallery.create/update`, provocando `Unknown argument imageUrls` → 500.
- `GET` (lista y detalle) ya hace `include: { images: { orderBy: { order } } }`; `DELETE` ya funciona por cascade de la relación.
- En `GalleryImageUpload`, seleccionar N archivos dispara N `fetch` en paralelo y cada respuesta hace `onChange([...images, url])` con `images` capturado del mismo render (stale closure), por lo que solo sobrevive la última respuesta.

## Goals / Non-Goals

**Goals:**
- Que crear y editar una galería persistan la galería y sus filas de imagen con `order` correcto.
- Que subir varias imágenes a la vez conserve todas en la previsualización (y por tanto en el save).
- Mantener orden estable y determinístico de las imágenes.

**Non-Goals:**
- No migrar datos ni cambiar el esquema Prisma (ya está bien normalizado).
- No limpiar archivos físicos huérfanos en `public/uploads/` (la UI ya borra el archivo al quitarlo del formulario; la DB se sincroniza en el PUT).
- No tocar `/api/upload` (el endpoint de subida de un archivo funciona y no cambia).

## Decisions

### 1. POST /api/galleries: nested create de las imágenes

Reemplazar el `data: { ...data, clientId }` por un create que construya la relación:

```ts
const { imageUrls, ...rest } = data
prisma.gallery.create({
  data: {
    ...rest,
    clientId,
    images: { create: imageUrls.map((url, i) => ({ imageUrl: url, order: i })) },
  },
})
```

- Por qué nested create y no dos llamadas: atomicidad y orden trivial por índice del array.
- Alternativa descartada: insertar primero la galería y luego las imágenes por separado (riesgo de galería huérfana si falla el segundo paso, más código).

### 2. PUT /api/galleries/[id]: reemplazo transaccional de imágenes

El PUT debe actualizar título/descripción **y** dejar las filas de imagen exactamente iguales al payload. Como no conocemos los ids de las filas previas, la estrategia más simple y robusta es borrar y recrear dentro de una transacción:

```ts
await prisma.$transaction([
  prisma.gallery.update({ where: { id }, data: { title, description } }),
  prisma.galleryImage.deleteMany({ where: { galleryId: id } }),
  prisma.galleryImage.createMany({
    data: imageUrls.map((url, i) => ({ galleryId: id, imageUrl: url, order: i })),
  }),
])
```

- Por qué borrar+recrear y no diff por URL: el array permite reordenar y duplicar menos trabajo; el diff por URL complica el manejo de `order` sin beneficio a este volumen (galerías de decenas de imágenes).
- Por qué en `$transaction`: evita que un fallo a mitad deje la galería sin imágenes.
- Se conserva la precondición actual (verificar que la galería existe y pertenece al cliente) antes de transaccionar.

### 3. GalleryImageUpload: subida múltiple secuencial con estado acumulado

Reescribir el manejo de selección/drop para procesar la tanda de archivos **en serie** (un `for...of` con `await` por archivo) en lugar de disparar N fetches en paralelo:

```ts
const base = [...images]                     // snapshot del render actual
const uploaded: string[] = []
for (const file of files) {
  const url = await uploadOne(file)          // fetch /api/upload + manejo de error
  if (url) { uploaded.push(url); onChange([...base, ...uploaded]) }
}
```

- Por qué secuencial: elimina la raza del stale closure por diseño (nunca hay dos escrituras concurrentes compitiendo), mantiene el orden de subida determinístico y evita saturar el servidor con N procesos de sharp a la vez.
- El estado `uploading` (un solo booleano) ya deshabilita el dropzone durante la tanda, así que no hay re-entrada que invalide el snapshot `base`.
- Alternativa descartada: paralelizar y consolidar al final con un acumulador indexado — más estados a coordinar (contador de pendientes, orden de llegada) para un ahorro que a volúmenes típicos no justifica.
- Manejo de error por archivo: si uno falla se muestra el toast y se continúa con el resto, cumpliendo el escenario "Fallo de subida de un archivo entre varios".

## Risks / Trade-offs

- [Borrar+recrear en PUT reasigna ids de filas de imagen] → Inofensivo: `order` es lo que consume el GET; nada referencia ids de `gallery_image`.
- [Transacción abierta mientras se recrean imágenes] → Operaciones pequeñas y locales; `$transaction` con arreglo es atómico y rápido.
- [Subida secuencial más lenta con muchas imágenes grandes] → Aceptable para galerías típicas; si fuera problema, escalar a un límite de concurrencia pequeño (p. ej. 3) manteniendo consolidación al final.
- [Quitar una imagen ya persistida solo borra el archivo si se quita desde el formulario] → Ya es el comportamiento actual; el PUT sincroniza la DB. No se escala a limpieza global de disco en este change.

## Migration Plan

- Solo código de panel (`app/api/galleries/*`, `components/dashboard/GalleryImageUpload.tsx`): deploy normal por GitHub Actions, sin migración de DB.
- Rollback: revertir el commit; no hay cambio de esquema ni de datos que deshacer.
- Verificación post-deploy: crear galería con N imágenes y guardar → debe redirigir a listado y persistir N filas ordenadas; editar quitando/reordenando → la galería queda exacta; seleccionar N archivos a la vez → los N aparecen en la grilla.
- No aplica "Actualizar nodo" en nodos remotos (no toca streaming-agent ni scripts de streaming).
