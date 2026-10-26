# Spec Delta

## Purpose

Permite a cada cliente administrar una colección ordenada de banners promocionales con imagen y enlace opcional, y los expone en la API pública de su sitio para que la PWA pueda mostrarlos.

## ADDED Requirements

### Requirement: Gestión de banners en el dashboard

El panel SHALL ofrecer una sección "Banner" dentro del grupo "Contenido" donde el cliente autenticado puede listar, crear, editar y eliminar sus propios banners. La sección SHALL respetar la visibilidad y los permisos del ítem de menú configurados para cada cliente.

#### Scenario: Crear un banner

- **WHEN** el cliente completa la imagen y guarda un nuevo banner
- **THEN** el panel crea el banner asociado a su cliente y lo muestra en el listado

#### Scenario: Imagen obligatoria

- **WHEN** el cliente intenta guardar un banner sin imagen
- **THEN** el panel rechaza la operación con un mensaje de validación y no crea ni modifica el banner

#### Scenario: Editar y eliminar banners propios

- **WHEN** el cliente edita o elimina un banner de su listado
- **THEN** el panel actualiza o elimina únicamente ese banner de su cliente

#### Scenario: Banner de otro cliente

- **WHEN** un cliente intenta consultar, editar o eliminar un banner que pertenece a otro cliente
- **THEN** el sistema responde como no encontrado o no autorizado y no altera los datos del otro cliente

#### Scenario: Menú deshabilitado

- **WHEN** el administrador deshabilita el ítem de menú Banner para un cliente
- **THEN** el cliente no puede abrir la sección ni usar sus APIs de gestión

#### Scenario: Cliente sin banners

- **WHEN** el cliente abre la sección Banner y no tiene banners
- **THEN** el panel muestra un estado vacío con la opción de crear el primero

### Requirement: Datos y orden de los banners

Cada banner SHALL tener una imagen, un enlace opcional, un orden de presentación y pertenecer a un único cliente. El listado del dashboard y la API pública SHALL devolver los banners ordenados por su orden de presentación y, en empate, por fecha de creación ascendente.

#### Scenario: Enlace opcional

- **WHEN** el cliente guarda un banner sin enlace
- **THEN** el banner se guarda correctamente y la PWA lo muestra sin comportamiento de clic

#### Scenario: Orden de presentación

- **WHEN** el cliente define distintos valores de orden para sus banners
- **THEN** el listado y la API pública devuelven primero los banners con el orden menor

#### Scenario: Aislamiento por cliente

- **WHEN** el cliente consulta sus banners
- **THEN** la respuesta incluye únicamente banners de su propio cliente

### Requirement: Validación de datos del banner

El sistema SHALL validar que la imagen sea obligatoria y no vacía. Si se informa un enlace, el sistema SHALL aceptar únicamente URLs absolutas con esquema `http` o `https` y SHALL rechazar esquemas ejecutables o URLs malformadas.

#### Scenario: Enlace inválido

- **WHEN** el cliente guarda un banner con un enlace que no es `http` ni `https`
- **THEN** el panel rechaza la operación con un mensaje de validación y no guarda el banner

#### Scenario: Enlace válido

- **WHEN** el cliente guarda un banner con un enlace `https` válido
- **THEN** el banner se guarda con ese enlace para que la PWA lo use

### Requirement: Exposición en la API pública

La API pública de contenido del cliente SHALL incluir sus banners ordenados, con los campos públicos necesarios para renderizarlos (imagen, enlace opcional y orden). La API SHALL exponer también una ruta pública dedicada de banners del cliente. Ninguna de las respuestas SHALL incluir banners de otros clientes.

#### Scenario: Datos agregados del sitio

- **WHEN** la PWA solicita los datos completos del cliente
- **THEN** la respuesta incluye la lista de banners del cliente ordenada para su presentación

#### Scenario: Ruta dedicada de banners

- **WHEN** un consumidor solicita la ruta pública de banners de un cliente
- **THEN** recibe los banners públicos de ese cliente en el mismo orden de presentación

#### Scenario: Sin banners

- **WHEN** el cliente no tiene banners cargados
- **THEN** las respuestas públicas devuelven una lista vacía sin error

### Requirement: Actualización de la caché pública

Cualquier alta, edición o eliminación de un banner SHALL invalidar la caché del contenido público para que el sitio muestre los cambios en la siguiente consulta.

#### Scenario: Cambio visible tras editar

- **WHEN** el cliente modifica o elimina un banner
- **THEN** la siguiente consulta pública devuelve la colección actualizada y no una versión en caché anterior
