# Monitoring Specification

## Purpose

Panel de monitoreo operativo del administrador: muestra el estado general del servidor (carga de CPU, RAM, disco) y el estado de streaming de cada cliente (audio y video), con oyentes y espectadores en vivo, actualizándose periódicamente.

## Requirements

### Requirement: El administrador ve el estado general del servidor
El sistema SHALL exponer una vista que muestre el estado del servidor donde corre el panel: carga de CPU (promedios 1/5/15 minutos y uso porcentual), memoria usada/libre/total, espacio en disco usado/libre, uptime del sistema y cantidad de contenedores activos. La carga SHALL reflejar el host real (no solo el contenedor del panel).

#### Scenario: Carga del servidor visible
- **WHEN** el administrador abre la vista de monitoreo
- **THEN** ve la carga de CPU (load 1/5/15 + %), RAM y disco del VPS
- **AND** los valores reflejan el host donde corren los contenedores

#### Scenario: Sin acceso al host
- **WHEN** el agente no puede leer la carga del host
- **THEN** la vista muestra los valores como no disponibles sin romper el resto del panel

### Requirement: El administrador ve el estado de streaming de cada cliente
El sistema SHALL mostrar, por cliente, el estado de su streaming de audio (radio) y de video (TV): AutoDJ, EN VIVO (DJ/OBS) u OFF, en una misma tabla unificada.

#### Scenario: Estado de audio y video en la misma vista
- **WHEN** el administrador abre la vista de monitoreo
- **THEN** cada cliente muestra dos columnas de estado (radio y video)
- **AND** el estado refleja AutoDJ / EN VIVO / OFF según el stream correspondiente

#### Scenario: Cliente sin stream de radio o video
- **WHEN** un cliente no tiene stream de radio o de video configurado
- **THEN** la columna correspondiente indica que no tiene ese servicio

### Requirement: El administrador ve oyentes y espectadores en vivo
El sistema SHALL mostrar la cantidad de oyentes en vivo (radio, leídos de Icecast) y de espectadores de video (TV) por cliente. Los espectadores de video SHALL contarse como las IPs únicas que solicitan el manifiesto `.m3u8` del stream en una ventana reciente (~30 segundos).

#### Scenario: Oyentes de radio visibles
- **WHEN** un cliente tiene su radio al aire con oyentes
- **THEN** la vista muestra el conteo de oyentes en vivo desde Icecast

#### Scenario: Espectadores de video visibles
- **WHEN** un cliente tiene su video al aire con espectadores
- **THEN** la vista muestra el conteo aproximado de espectadores (IPs únicas del `.m3u8`)

#### Scenario: Sin datos de espectadores
- **WHEN** no hay solicitudes recientes al `.m3u8` o no se puede leer el log
- **THEN** la vista muestra 0 espectadores sin romper el panel

### Requirement: La vista de monitoreo se actualiza periódicamente
El sistema SHALL refrescar automáticamente la vista de monitoreo cada 10 segundos, y permitir una actualización manual.

#### Scenario: Actualización automática
- **WHEN** la vista de monitoreo está abierta
- **THEN** se refresca automáticamente cada 10 segundos
- **AND** se indica que hay una actualización en curso para no confundir con datos viejos

#### Scenario: Actualización manual
- **WHEN** el administrador pulsa el botón de refrescar
- **THEN** la vista se actualiza de inmediato sin esperar el ciclo automático

### Requirement: La vista es accesible solo para administradores
El sistema SHALL restringir la vista de monitoreo y sus endpoints a usuarios con rol ADMIN.

#### Scenario: Acceso denegado a no administradores
- **WHEN** un usuario sin rol ADMIN intenta abrir `/admin/monitor` o sus endpoints
- **THEN** el acceso es denegado
