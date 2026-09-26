# Spec Delta

## Purpose

Permite a cada cliente administrar los mensajes o frases de su "Barra GC" desde el panel y exponerlos públicamente vía API, para que su sitio los consuma como cintillo de contenido.

## ADDED Requirements

### Requirement: Gestión de mensajes de la Barra GC en el panel
El sistema SHALL exponer una sección "Barra GC" dentro del grupo Contenido del dashboard, donde el cliente puede crear, editar, activar/desactivar, ordenar y eliminar mensajes o frases. Cada mensaje SHALL tener un texto obligatorio, un estado activo/inactivo y un orden.

#### Scenario: Crear un mensaje
- **WHEN** el cliente crea un mensaje con texto válido en `/dashboard/gc-bar`
- **THEN** el sistema persiste el mensaje asociado a su cliente y lo muestra en la lista

#### Scenario: Texto vacío rechazado
- **WHEN** el cliente intenta crear o editar un mensaje sin texto
- **THEN** el sistema rechaza la operación con un error de validación y no persiste el cambio

#### Scenario: Activar, desactivar o eliminar un mensaje
- **WHEN** el cliente cambia el estado activo de un mensaje o lo elimina
- **THEN** el sistema persiste el cambio y refleja el nuevo estado en la lista

#### Scenario: Ordenar mensajes
- **WHEN** el cliente define el orden de un mensaje
- **THEN** el sistema persiste ese orden y la lista del panel se muestra ordenada por ese valor

### Requirement: Aislamiento por cliente y permisos de menú
El sistema SHALL restringir la gestión y lectura de los mensajes de la Barra GC al cliente efectivo de la sesión, y SHALL respetar el guard del ítem de menú `gc-bar` (plan/permisos) aplicado al resto de las secciones.

#### Scenario: Un cliente no accede a mensajes de otro
- **WHEN** un cliente autenticado opera sobre la Barra GC
- **THEN** solo puede ver y modificar los mensajes de su propio cliente

#### Scenario: Sección deshabilitada para el cliente
- **WHEN** el ítem de menú `gc-bar` está deshabilitado para el cliente (por plan o permisos)
- **THEN** el acceso a la página y a la API de panel de Barra GC responde `403` / redirige al dashboard

### Requirement: Exposición pública de los mensajes activos
El sistema SHALL exponer los mensajes activos de la Barra GC de un cliente mediante la API pública, con CORS abierto y sin autenticación. La respuesta SHALL incluir los mensajes activos ordenados por su campo de orden de forma ascendente.

#### Scenario: Endpoint dedicado
- **WHEN** se consulta `GET /api/public/{clientId}/gc-bar` para un cliente existente
- **THEN** el sistema responde `200` con la lista de mensajes activos de ese cliente, ordenados por orden ascendente

#### Scenario: Cliente inexistente
- **WHEN** se consulta el endpoint con un `clientId` que no existe
- **THEN** el sistema responde `404`

#### Scenario: Mensajes inactivos no expuestos
- **WHEN** un mensaje está inactivo
- **THEN** no aparece en la respuesta del endpoint público ni en el payload agregado

### Requirement: Barra GC en el payload agregado
El sistema SHALL incluir la clave `gcBar` en la respuesta de `GET /api/public/{clientId}` con los mensajes activos del cliente, siguiendo el formato del resto del contenido.

#### Scenario: Payload agregado incluye gcBar
- **WHEN** se consulta `GET /api/public/{clientId}`
- **THEN** la respuesta incluye la clave `gcBar` con los mensajes activos ordenados, además del resto del contenido
