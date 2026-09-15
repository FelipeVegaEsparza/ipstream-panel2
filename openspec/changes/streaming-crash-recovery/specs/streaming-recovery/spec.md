## Purpose

Mantener el AutoDJ de radio al aire de forma continua: los callbacks del stream no deben poder tumbar el proceso, y un stream caído debe recuperarse solo sin intervención manual, sin interrumpir transmisiones en vivo y sin afectar a otros nodos.

## ADDED Requirements

### Requirement: Los callbacks del AutoDJ no terminan el proceso
El sistema SHALL generar callbacks de notificación al agente (conexión/desconexión de DJ y arranque de track) de modo que su ejecución no pueda provocar la terminación del proceso Liquidsoap, incluso si la notificación falla o el proceso de notificación no puede completarse.

#### Scenario: Se dispara un callback de arranque de track
- **WHEN** el AutoDJ comienza a reproducir un track y se dispara la notificación de track iniciado
- **THEN** el proceso Liquidsoap continúa en ejecución
- **AND** el stream sigue publicándose en Icecast

#### Scenario: La notificación no puede entregarse
- **WHEN** el agente no está disponible para recibir la notificación de un callback
- **THEN** el proceso Liquidsoap continúa en ejecución
- **AND** el stream no se interrumpe

### Requirement: Los streams caídos se recuperan automáticamente
El sistema SHALL detectar los streams cuyo proceso ya no está en ejecución y reiniciarlos automáticamente, sin requerir acción manual del operador.

#### Scenario: El proceso Liquidsoap muere
- **WHEN** el supervisor detecta que un stream marcado como en ejecución ya no tiene proceso activo
- **THEN** el sistema reinicia el stream automáticamente
- **AND** el mount vuelve a publicarse en Icecast dejando de responder 404

#### Scenario: El reinicio automático falla
- **WHEN** el reinicio automático no logra levantar el proceso
- **THEN** el sistema reintenta con un intervalo creciente (backoff) hasta un tope de intentos
- **AND** al agotar los intentos marca el stream como detenido y registra el motivo

### Requirement: La recuperación automática respeta el estado intencional
El sistema SHALL abstenerse de reiniciar un stream que fue detenido intencionalmente o que está deshabilitado.

#### Scenario: El operador detuvo el stream
- **WHEN** un stream fue detenido manualmente (no por caída)
- **THEN** el sistema no lo reinicia automáticamente

#### Scenario: El stream está deshabilitado
- **WHEN** un stream tiene `enabled = 0` (kill switch del admin)
- **THEN** el sistema no lo reinicia automáticamente

### Requirement: La recuperación no interrumpe a un DJ en vivo
El sistema SHALL abstenerse de reiniciar un stream si hay un DJ conectado al harbor, para no cortar una transmisión en vivo ante una detección errónea.

#### Scenario: DJ conectado durante la detección
- **WHEN** el supervisor cree que el proceso no está en ejecución pero hay un DJ conectado al harbor
- **THEN** el sistema no reinicia el stream
- **AND** registra la discrepancia para diagnóstico

### Requirement: Los reinicios automáticos quedan auditados
El sistema SHALL registrar en `streaming_audit_logs` cada reinicio automático y cada abandono tras agotar los reintentos.

#### Scenario: Reinicio automático exitoso
- **WHEN** el sistema reinicia un stream caído y el proceso arranca
- **THEN** se registra una entrada de auditoría con el mount, el motivo y el PID nuevo

#### Scenario: Se agotan los reintentos
- **WHEN** el sistema agota el tope de reintentos sin recuperar el stream
- **THEN** se registra una entrada de auditoría con el motivo del abandono

### Requirement: La supervisión se acota al servidor propio
El sistema SHALL limitar la supervisión y los chequeos por telnet a los streams asignados al servidor donde corre el agente, sin sondear streams de otros nodos.

#### Scenario: Stream asignado a otro nodo
- **WHEN** un agente ve un stream marcado como en ejecución cuyo `serverId` corresponde a otro servidor
- **THEN** el agente no intenta consultar su telnet ni lo marca como detenido
- **AND** no genera errores de conexión por ese stream
