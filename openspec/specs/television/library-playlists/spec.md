# Library Playlists Specification

## Purpose

Gestión unificada de la videoteca y las playlists de video de Televisión: la videoteca como fuente de archivos con agregado de videos a playlists desde ella, y un editor de playlists completo con búsqueda, filtro por carpeta, selección múltiple y reordenamiento.

## Requirements

### Requirement: El operador agrega videos a una playlist desde la Videoteca
La interfaz de la Videoteca SHALL permitir seleccionar varios videos y agregarlos a una playlist existente en una sola acción, además de las operaciones actuales de mover a carpeta.

#### Scenario: Agregar videos seleccionados a una playlist
- **WHEN** el operador selecciona uno o más videos en la Videoteca y elige una playlist en "Agregar a playlist..."
- **THEN** los videos se añaden al final de la playlist elegida
- **AND** el sistema informa cuántos videos se agregaron

#### Scenario: Agregar videos sin selección
- **WHEN** el operador intenta agregar a una playlist sin haber seleccionado videos
- **THEN** la acción no se ofrece o no tiene efecto

### Requirement: El editor de playlists de TV permite buscar y filtrar
La interfaz de playlists de TV SHALL permitir buscar videos por título y filtrar por carpeta de la videoteca al agregar tracks, sin mostrar una lista duplicada como fuente principal.

#### Scenario: Buscar videos al agregar
- **WHEN** el operador escribe en el buscador del editor de playlists
- **THEN** la lista de videos disponibles se filtra por el texto del título

#### Scenario: Filtrar por carpeta
- **WHEN** el operador elige una carpeta en el editor de playlists
- **THEN** solo se muestran los videos de esa carpeta (y los de "sin carpeta" si se elige esa opción)

### Requirement: El operador agrega varios tracks a una playlist a la vez
El editor de playlists de TV SHALL permitir seleccionar múltiples tracks y agregarlos todos a la playlist en una sola operación.

#### Scenario: Agregar tracks seleccionados
- **WHEN** el operador selecciona varios tracks disponibles y confirma el agregado
- **THEN** todos los tracks seleccionados se agregan a la playlist
- **AND** los tracks ya presentes en la playlist no se duplican

### Requirement: El operador reordena los tracks de una playlist de TV
El editor de playlists de TV SHALL permitir reordenar los tracks de la playlist mediante arrastrar y soltar, y guardar el nuevo orden.

#### Scenario: Reordenar tracks
- **WHEN** el operador arrastra un track a una posición distinta y guarda el orden
- **THEN** el orden de reproducción de la playlist queda actualizado
- **AND** el sistema persiste las nuevas posiciones

#### Scenario: Reordenar sin guardar
- **WHEN** el operador reordena pero no guarda
- **THEN** el orden original se mantiene hasta confirmar

### Requirement: La Videoteca es la fuente de archivos
La sección Videoteca SHALL seguir concentrando las operaciones de gestión de archivos de video (subir, carpetas, mover entre carpetas, eliminar, buscar), y la sección de playlists SHALL dejar de listar la videoteca completa como fuente principal de agregado.

#### Scenario: Subir y luego agregar a playlist
- **WHEN** el operador sube un video en la Videoteca y luego quiere incluirlo en una playlist
- **THEN** puede agregarlo desde la Videoteca (selección) o desde el editor de playlists con búsqueda
- **AND** no necesita navegar a otra sección para encontrarlo

#### Scenario: La playlists no duplica la lista de videos
- **WHEN** el operador abre la sección de playlists
- **THEN** la fuente de agregado es el buscador/filtro del editor, no una lista duplicada de todos los videos
