## Purpose

Parrilla horaria de playlists de video: permite a un cliente de Televisión programar qué playlist se reproduce en cada franja del día, como una grilla de TV tradicional, y hace que el AutoDJ la aplique automáticamente.

## ADDED Requirements

### Requirement: El cliente puede listar sus franjas horarias
El sistema SHALL exponer un endpoint que devuelva todas las franjas horarias programadas del cliente de video, ordenadas por día de la semana y hora de inicio, con el nombre de la playlist asociada.

#### Scenario: Listar franjas de un cliente
- **WHEN** un cliente autenticado consulta su parrilla de video
- **THEN** el sistema devuelve las franjas programadas con su día, hora inicio, hora fin, estado activo, y el nombre y cantidad de tracks de la playlist asociada

#### Scenario: Cliente sin franjas
- **WHEN** un cliente consulta su parrilla sin tener franjas creadas
- **THEN** el sistema devuelve una lista vacía

### Requirement: El cliente puede crear una franja horaria
El sistema SHALL permitir crear una franja horaria indicando playlist, día de la semana (0=domingo..6=sábado), hora de inicio y hora fin en formato `HH:mm`. La franja nace activa.

#### Scenario: Crear franja válida
- **WHEN** un cliente crea una franja con una playlist propia, un día 0-6 y horas `HH:mm` válidas
- **THEN** el sistema crea la franja y la devuelve con su id
- **AND** la franja queda activa

#### Scenario: Crear franja con playlist ajena
- **WHEN** un cliente intenta crear una franja con una playlist que no le pertenece
- **THEN** el sistema rechaza la operación con error `playlist_no_encontrada`

#### Scenario: Crear franja con datos inválidos
- **WHEN** un cliente envía una franja sin playlist, con día fuera de 0-6, o con horas que no cumplen `HH:mm`
- **THEN** el sistema rechaza la operación con un error de validación

### Requirement: El cliente puede actualizar y eliminar franjas
El sistema SHALL permitir editar (playlist, día, horas, estado activo) y eliminar una franja existente del cliente.

#### Scenario: Editar franja existente
- **WHEN** un cliente envía cambios parciales sobre una franja propia
- **THEN** el sistema aplica los campos provistos y devuelve éxito

#### Scenario: Editar o eliminar franja inexistente
- **WHEN** un cliente intenta editar o eliminar una franja que no existe o no le pertenece
- **THEN** el sistema rechaza la operación con error `not_found`

#### Scenario: Eliminar franja
- **WHEN** un cliente elimina una franja propia
- **THEN** el sistema la elimina y deja de considerarla para la parrilla

### Requirement: El sistema resuelve la franja vigente "ahora"
El sistema SHALL exponer un endpoint que devuelva la franja activa cuyo horario contiene el momento actual, o `null` si no hay ninguna. Las franjas que cruzan la medianoche (inicio posterior al fin) SHALL cubrir el rango hasta la madrugada del día siguiente.

#### Scenario: Hay una franja vigente
- **WHEN** el día y la hora actual caen dentro de una franja activa
- **THEN** el sistema devuelve esa franja con su playlist asociada

#### Scenario: No hay franja vigente
- **WHEN** el momento actual no cae en ninguna franja activa
- **THEN** el sistema devuelve `current: null`

#### Scenario: Franja que cruza la medianoche
- **WHEN** es de madrugada y una franja activa como 23:00-01:00 cubre ese horario
- **THEN** el sistema devuelve esa franja como vigente

### Requirement: El sistema aplica la parrilla automáticamente
El sistema SHALL revisar periódicamente la parrilla de cada cliente de video en reproducción y, cuando la playlist que toca según el horario difiera de la playlist actualmente activa, activar la nueva, desactivar la anterior y reiniciar el AutoDJ con el nuevo playlist.

#### Scenario: Cambio de franja durante la reproducción
- **WHEN** la hora actual cruza el inicio de una franja cuya playlist difiere de la activa
- **THEN** el sistema activa la playlist de la franja y desactiva la anterior
- **AND** el AutoDJ de video se reinicia reproduciendo la nueva playlist
- **AND** el estado del stream permanece `autodj`

#### Scenario: No hay cambio de franja
- **WHEN** la playlist que toca según el horario es la misma que la activa, o no hay franja vigente
- **THEN** el sistema no reinicia el AutoDJ ni cambia la playlist activa

### Requirement: El AutoDJ reproduce la playlist activa
El sistema SHALL hacer que la puesta en marcha del AutoDJ de video (manual y automática) reproduzca las entries de la playlist activa del cliente. Si el cliente no tiene ninguna playlist marcada como activa, el AutoDJ SHALL reproducir todas las entries del cliente.

#### Scenario: Iniciar AutoDJ con playlist activa
- **WHEN** se inicia el AutoDJ y el cliente tiene una playlist activa con tracks
- **THEN** el sistema genera el playlist con las entries de esa playlist
- **AND** el encoder arranca reproduciéndolas

#### Scenario: Iniciar AutoDJ sin playlist activa
- **WHEN** se inicia el AutoDJ y el cliente no tiene playlist activa
- **THEN** el sistema usa todas las entries del cliente
- **AND** si no hay entries, el sistema rechaza el arranque con error de playlist vacía

### Requirement: La interfaz de parrilla TV
El sistema SHALL proveer una interfaz en `/dashboard/television/schedule` que permita ver la parrilla organizada por día, crear/editar/eliminar franjas, y mostrar la franja vigente en el momento actual.

#### Scenario: La interfaz muestra la parrilla por día
- **WHEN** un cliente abre la sección Parrilla TV con franjas creadas
- **THEN** se muestran las franjas agrupadas por día de la semana, ordenadas por hora de inicio

#### Scenario: La interfaz muestra la franja vigente
- **WHEN** una franja está al aire en ese momento
- **THEN** la interfaz la resalta y muestra un indicador "Ahora" con el nombre de la playlist

#### Scenario: Crear franja desde la interfaz
- **WHEN** un cliente crea una franja desde la interfaz eligiendo playlist, día y horas
- **THEN** la franja se guarda y la parrilla se refresca

#### Scenario: Editar y eliminar desde la interfaz
- **WHEN** un cliente edita o elimina una franja desde la interfaz
- **THEN** la operación se aplica y la parrilla se refresca
