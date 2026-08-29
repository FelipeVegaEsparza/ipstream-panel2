## Purpose

Control del AutoDJ de radio por cliente desde el panel de administración: iniciar y detener el AutoDJ de cada cliente individualmente, y garantizar contenido por defecto (playlist + tema inicial) para clientes nuevos con RadioStream, de modo que el AutoDJ siempre tenga algo que reproducir.

## ADDED Requirements

### Requirement: El administrador inicia y detiene el AutoDJ de cada cliente
El sistema SHALL permitir al administrador, desde la sección `/admin/streaming`, iniciar o detener el AutoDJ de un cliente con RadioStream de forma individual, según el estado actual del stream.

#### Scenario: Iniciar el AutoDJ de un cliente
- **WHEN** el administrador pulsa "Iniciar" en un cliente cuyo RadioStream está apagado
- **THEN** el sistema inicia el AutoDJ de ese cliente
- **AND** el estado mostrado pasa a "AutoDJ" y la acción queda registrada en la auditoría

#### Scenario: Detener el AutoDJ de un cliente
- **WHEN** el administrador pulsa "Detener" en un cliente cuyo AutoDJ está corriendo
- **THEN** el sistema detiene el AutoDJ de ese cliente
- **AND** el estado mostrado pasa a "OFF" y la acción queda registrada en la auditoría

#### Scenario: Iniciar cuando el stream ya está corriendo
- **WHEN** el administrador intenta iniciar el AutoDJ de un cliente cuyo stream ya está activo
- **THEN** el sistema no lo inicia dos veces y muestra un error/aviso al administrador

#### Scenario: Cliente sin RadioStream
- **WHEN** el administrador intenta iniciar/detener el AutoDJ de un cliente sin RadioStream
- **THEN** el sistema no ofrece la acción o la rechaza con un error claro

### Requirement: Los clientes nuevos reciben contenido por defecto para el AutoDJ
El sistema SHALL crear automáticamente, cuando se crea un cliente con RadioStream, una playlist activa con un tema por defecto, de modo que el AutoDJ tenga siempre algo que reproducir.

#### Scenario: Cliente nuevo con RadioStream
- **WHEN** se crea un cliente (registro público o desde el admin) y se le crea su RadioStream
- **THEN** el sistema agrega un tema por defecto (MP3 incluido en el proyecto) a su biblioteca
- **AND** crea una playlist activa con ese tema, lista para sonar

#### Scenario: Contenido por defecto ya existente
- **WHEN** se intenta agregar el contenido por defecto a un cliente que ya tiene tracks o una playlist
- **THEN** el sistema no duplica el contenido por defecto

#### Scenario: Fallo al crear el contenido por defecto
- **WHEN** falla la creación del tema o la playlist por defecto al crear un cliente
- **THEN** el cliente se crea igualmente (con su RadioStream) y el fallo no impide la creación
