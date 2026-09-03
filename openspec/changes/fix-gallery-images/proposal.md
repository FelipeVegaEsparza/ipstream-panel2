## Why

Crear o editar una galería de imágenes siempre termina en el toast "Error interno del servidor" porque el payload `imageUrls[]` se envía directo a `prisma.gallery.create/update`, pero las imágenes viven normalizadas en la tabla `gallery_images` (relación `GalleryImage[]`), así que Prisma rechaza el campo. Además, al seleccionar varias imágenes a la vez solo queda una en la grilla: los uploads en paralelo pisan el estado con un closure obsoleto.

## What Changes

- **Persistencia de imágenes de galería** — `POST /api/galleries` ahora crea la galería **y** sus filas en `gallery_images` con su `order` (nested create). `PUT /api/galleries/[id]` ahora reemplaza las imágenes de la relación (borra las existentes y recrea las enviadas, respetando el orden del array `imageUrls`), en vez de ignorarlas y provocar 500.
- **Carga masiva de imágenes** — `GalleryImageUpload` deja de sobrescribirse a sí mismo: el estado de la grilla se actualiza de forma acumulativa/segura cuando varias imágenes suben en paralelo, por lo que seleccionar N archivos conserva los N en la previsualización.
- No cambia el esquema de BD ni el modelo de datos; es corrección de comportamiento de la API y del componente de subida.

## Capabilities

### New Capabilities

- `galleries`: capacidad de gestión de galerías de imágenes del dashboard de cliente — creación/edición que persisten la galería y sus imágenes (con orden), y subida múltiple de imágenes que conserva todos los archivos seleccionados.

### Modified Capabilities

- Ninguna: no existe spec previa de galerías; el comportamiento corregido queda capturado en la nueva capacidad `galleries`.

## Impact

- `app/api/galleries/route.ts` — nested create de `GalleryImage[]` con `order` en el POST.
- `app/api/galleries/[id]/route.ts` — el PUT reemplaza la relación de imágenes; GET/DELETE ya funcionan (cascade).
- `components/dashboard/GalleryImageUpload.tsx` — lógica de subida múltiple sin pérdida de estado.
- Solo toca panel (app/*, components/*): **no** se toca streaming-agent ni nodos, así que no hace falta "Actualizar nodo" tras el deploy.
