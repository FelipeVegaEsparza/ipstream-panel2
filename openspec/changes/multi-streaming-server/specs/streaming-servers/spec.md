## Purpose

Registro y gestión de servidores de streaming (radio y TV), asignación de clientes por servicio, enrutamiento de contenido hacia el servidor correcto y migración manual de clientes entre servidores.

## ADDED Requirements

### Requirement: El administrador registra servidores de streaming
El sistema SHALL permitir al administrador dar de alta, editar, listar y dar de baja servidores de streaming. Cada servidor SHALL declarar su tipo (`radio`, `tv` o `ambos`), nombre, URL del agente, token de autenticación, hostname público y estado de salud. Un servidor dado de baja SHALL dejar de aceptar asignaciones nuevas.

#### Scenario: Registrar un servidor de radio
- **WHEN** el administrador da de alta un servidor de tipo `radio` con su URL de agente, token y hostname público
- **THEN** el servidor queda disponible como destino de asignación de radios
- **AND** el panel realiza un health check inicial y muestra su estado

#### Scenario: Editar un servidor existente
- **WHEN** el administrador modifica el hostname público o el token de un servidor registrado
- **THEN** los cambios se aplican a las URLs públicas y a las llamadas del panel hacia ese servidor

#### Scenario: Dar de baja un servidor con clientes asignados
- **WHEN** el administrador intenta dar de baja un servidor que aún tiene clientes asignados
- **THEN** el sistema lo impide y le indica cuántos clientes tiene asignados y que debe migrarlos primero

### Requirement: El cliente se asigna a un servidor de streaming por servicio
El sistema SHALL permitir asignar, de forma manual, el servidor que hospeda la radio y el que hospeda la televisión de cada cliente. La radio y la televisión de un mismo cliente SHALL poder vivir en servidores distintos. Al crear o editar un cliente, el administrador SHALL elegir el servidor de radio y/o el de video.

#### Scenario: Asignar radio y TV en el mismo servidor
- **WHEN** el administrador crea un cliente y asigna tanto su radio como su TV al mismo servidor
- **THEN** el servidor queda registrado como hospedaje de ambos servicios del cliente

#### Scenario: Asignar radio y TV en servidores distintos
- **WHEN** el administrador asigna la radio de un cliente al servidor R1 y su televisión al servidor TV1
- **THEN** cada servicio del cliente usa su propio servidor de streaming

#### Scenario: Cliente sin un servicio
- **WHEN** un cliente no tiene radio o no tiene televisión configurada
- **THEN** no requiere asignación para el servicio que no posee

### Requirement: El contenido de biblioteca se sube al servidor asignado
El sistema SHALL enrutar las subidas de biblioteca (audio y video) hacia el servidor de streaming que hospeda el servicio correspondiente del cliente. La metadata (títulos, duración, carátulas) SHALL permanecer centralizada en el panel.

#### Scenario: Subir un MP3 a la biblioteca de radio
- **WHEN** un cliente sube un MP3 a su biblioteca de radio
- **THEN** el archivo se almacena en el servidor de radio asignado al cliente
- **AND** el panel registra la metadata del track de forma centralizada

#### Scenario: Subir un video a la biblioteca de TV
- **WHEN** un cliente sube un video a su biblioteca de televisión
- **THEN** el archivo se almacena en el servidor de video asignado al cliente

#### Scenario: Subida con servidor no disponible
- **WHEN** el servidor asignado no responde durante una subida
- **THEN** el sistema informa el error al cliente y no registra el archivo como subido

### Requirement: Las URLs públicas de streaming se derivan del servidor asignado
El sistema SHALL generar las URLs públicas de streaming (mount de Icecast para radio, RTMP/HLS para TV) a partir del hostname público del servidor asignado al cliente, no de una configuración global.

#### Scenario: URL de radio del cliente
- **WHEN** el panel muestra o entrega la URL de streaming de la radio de un cliente
- **THEN** la URL usa el hostname público del servidor donde está asignada su radio

#### Scenario: URL de TV del cliente
- **WHEN** el panel muestra o entrega la URL de streaming de la televisión de un cliente
- **THEN** la URL usa el hostname público del servidor donde está asignada su TV

### Requirement: El administrador es alertado cuando un servidor de streaming está caído
El sistema SHALL monitorear periódicamente la salud de todos los servidores de streaming registrados y SHALL alertar visualmente al administrador cuando uno no responde, indicando la cantidad de clientes afectados. La alerta SHALL ser informativa: el sistema SHALL NOT migrar ni modificar asignaciones automáticamente.

#### Scenario: Servidor sin respuesta
- **WHEN** un servidor de streaming deja de responder a los health checks
- **THEN** el panel muestra una alerta con el servidor afectado y el número de clientes cuyos servicios hospeda

#### Scenario: Servidor vuelve a responder
- **WHEN** un servidor previamente caído vuelve a responder
- **THEN** la alerta desaparece y el servidor vuelve a mostrarse como operativo

#### Scenario: La alerta no ejecuta acciones automáticas
- **WHEN** un servidor está caído
- **THEN** el panel no migra clientes ni cambia asignaciones por su cuenta; solo informa

### Requirement: El administrador migra manualmente un cliente entre servidores
El sistema SHALL permitir al administrador migrar un cliente desde un servidor a otro de forma explícita y manual, por servicio (radio y/o TV). La migración SHALL transferir los archivos de biblioteca al destino, actualizar la asignación, iniciar el stream en el destino, detener el de origen, reescribir las URLs públicas del cliente y limpiar los archivos del origen. Si la migración falla a mitad de camino, el sistema SHALL dejar el cliente en un estado consistente.

#### Scenario: Migrar la radio de un cliente
- **WHEN** el administrador migra la radio de un cliente desde R1 a R2
- **THEN** los tracks y jingles del cliente se copian a R2, su radio inicia en R2 y se detiene en R1
- **AND** la asignación de radio del cliente pasa a R2 y sus URLs públicas de radio se actualizan

#### Scenario: Migrar radio y TV en conjunto
- **WHEN** el administrador migra radio y TV de un cliente desde un servidor a otro
- **THEN** ambos servicios se transfieren y quedan hospedados en el servidor destino

#### Scenario: Migrar solo uno de los servicios
- **WHEN** el administrador migra solo la radio de un cliente cuya TV está en otro servidor
- **THEN** la TV del cliente permanece intacta en su servidor original

#### Scenario: Fallo durante la migración
- **WHEN** la transferencia de archivos falla durante una migración
- **THEN** el sistema notifica el fallo, no deja el cliente parcialmente migrado y conserva el estado previo consistente (origen intacto o destino completo)

#### Scenario: Cliente sin servicio de streaming
- **WHEN** el administrador intenta migrar a un cliente que no tiene streams configurados
- **THEN** la opción de migración no está disponible o se informa que no hay nada que migrar
