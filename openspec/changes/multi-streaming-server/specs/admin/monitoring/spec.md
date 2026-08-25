## ADDED Requirements

### Requirement: El administrador ve el estado de salud de todos los servidores de streaming
El sistema SHALL exponer, en la vista de monitoreo, el estado de salud de cada servidor de streaming registrado: operativo o caído, tipo (radio/tv/ambos), cantidad de clientes que hospeda por servicio, y carga del host cuando sea legible.

#### Scenario: Estado de todos los servidores visible
- **WHEN** el administrador abre la vista de monitoreo
- **THEN** ve una lista de todos los servidores de streaming registrados con su estado y clientes asignados

#### Scenario: Estado de streaming de un cliente hospedado en un servidor caído
- **WHEN** un servidor de streaming está caído y el administrador ve el estado de streaming de los clientes que hospeda
- **THEN** la vista indica que el estado no está disponible por falta de respuesta del servidor, sin romper el resto del panel

### Requirement: El administrador es alertado cuando un servidor de streaming está caído
El sistema SHALL alertar visualmente al administrador cuando un servidor de streaming registrado deja de responder a los health checks, indicando el servidor afectado y la cantidad de clientes cuyos servicios hospeda. La alerta SHALL ser únicamente informativa y SHALL NOT ejecutar migraciones ni cambios de asignación automáticos.

#### Scenario: Servidor sin respuesta
- **WHEN** un servidor de streaming deja de responder a los health checks
- **THEN** la vista de monitoreo muestra una alerta con el servidor afectado y el número de clientes afectados

#### Scenario: Servidor recuperado
- **WHEN** un servidor previamente caído vuelve a responder
- **THEN** la alerta desaparece y el servidor vuelve a mostrarse como operativo

#### Scenario: Ninguna acción automática
- **WHEN** un servidor está caído
- **THEN** el panel no migra clientes ni cambia asignaciones automáticamente; solo informa y deja la migración manual a decisión del administrador
