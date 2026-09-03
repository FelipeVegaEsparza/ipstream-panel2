## Purpose

Permite al cliente del dashboard crear y editar galerías de imágenes que se guardan junto con sus imágenes (con orden) y subir varias imágenes de una vez sin perder ninguna.

## ADDED Requirements

### Requirement: Crear galería persiste sus imágenes

El sistema SHALL crear la galería y, en la misma operación, guardar cada imagen enviada en `imageUrls` como una fila de imagen asociada a la galería. El orden guardado de cada imagen SHALL corresponder a la posición del URL dentro del array `imageUrls` enviado. La operación SHALL responder con éxito (2xx) y el cuerpo de la galería creada SHALL incluir sus imágenes. Si el payload no incluye al menos una imagen, la creación SHALL fallar con error de validación (400).

#### Scenario: Crear galería con varias imágenes

- **WHEN** un cliente autenticado envía POST a la API de galerías con `title`, `description` y un `imageUrls` de N URLs
- **THEN** el sistema crea la galería y N filas de imagen, cada una con su `imageUrl` y un `order` 0..N-1 acorde a la posición en el array
- **AND** responde 2xx con la galería que incluye sus N imágenes ordenadas

#### Scenario: Crear galería sin imágenes

- **WHEN** un cliente autenticado envía POST a la API de galerías con un `imageUrls` vacío o ausente
- **THEN** el sistema responde un error de validación (400) sin crear la galería ni filas de imagen

### Requirement: Editar galería reemplaza sus imágenes

El sistema SHALL permitir actualizar `title` y `description` y SHALL reemplazar el conjunto de imágenes existente por las enviadas en `imageUrls`, de modo que tras la edición la galería tenga exactamente las imágenes enviadas en el orden indicado. Las filas de imagen que ya no estén en el payload SHALL eliminarse.

#### Scenario: Editar galería quitando y reordenando imágenes

- **WHEN** un cliente autenticado edita una galería propia enviando un `imageUrls` con un subconjunto reordenado de sus imágenes previas
- **THEN** el sistema actualiza título y descripción
- **AND** las filas de imagen de la galería quedan exactamente como el payload, con `order` acorde a la nueva posición
- **AND** las imágenes previas no incluidas en el payload quedan eliminadas de la galería

#### Scenario: Editar galería inexistente o ajena

- **WHEN** un cliente intenta editar una galería cuyo id no existe o no le pertenece
- **THEN** el sistema responde 404 sin modificar nada

### Requirement: Selección múltiple conserva todas las imágenes

El sistema SHALL permitir subir varias imágenes en una sola selección (selector de archivos o arrastrar y soltar). Cuando N archivos se seleccionan a la vez, la previsualización de la galería SHALL terminar mostrando las N imágenes subidas, sin que una respuesta de subida sobrescriba a otra.

#### Scenario: Subir varias imágenes de una vez

- **WHEN** el usuario selecciona o arrastra N archivos de imagen a la vez en el formulario de galería
- **THEN** el sistema sube los N archivos
- **AND** la grilla de previsualización muestra las N imágenes añadidas al conjunto ya existente

#### Scenario: Fallo de subida de un archivo entre varios

- **WHEN** uno de N archivos seleccionados falla al subirse pero el resto sube correctamente
- **THEN** el sistema muestra un error para el archivo fallido
- **AND** las imágenes que sí subieron se conservan en la previsualización
