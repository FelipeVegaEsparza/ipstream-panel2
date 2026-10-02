# Spec Delta

## Purpose

Permite subir videos de Televisión de gran tamaño (hasta un máximo configurable) con una cola de subida que muestra el progreso real por archivo y el total, sin que la subida quede colgada ni cargue el archivo completo en memoria.

## ADDED Requirements

### Requirement: Subida de videos grandes por streaming
El sistema SHALL aceptar la subida de archivos de video de hasta un tamaño máximo configurable (por defecto 2 GB). Los bytes SHALL transmitirse en streaming desde el navegador hasta el almacenamiento del nodo, SIN cargar el archivo completo en memoria ni en el panel ni en el agente. El tamaño máximo SHALL configurarse por entorno y reflejarse en la interfaz.

#### Scenario: Subir un video dentro del máximo
- **WHEN** el operador sube un video cuyo tamaño es menor o igual al máximo configurado
- **THEN** el archivo se almacena completo en el nodo de video
- **AND** la subida finaliza con estado exitoso

#### Scenario: Superar el tamaño máximo
- **WHEN** el operador intenta subir un video que supera el máximo configurado
- **THEN** el sistema rechaza la subida con un mensaje claro que indica el tamaño máximo permitido
- **AND** no se guarda un archivo parcial en la videoteca

#### Scenario: Subida de un archivo que no escala la memoria
- **WHEN** se sube un video grande (por ejemplo 1 GB)
- **THEN** el proceso del panel y el del agente mantienen un uso de memoria que no crece con el tamaño del archivo (la escritura a disco es progresiva)

### Requirement: Cola de subida con progreso en la Videoteca de TV
La interfaz de la Videoteca de TV SHALL ofrecer una cola de subida donde cada archivo muestra su estado (`pendiente`, `subiendo` con porcentaje, `procesando`, `completado`, `error`) y una barra de progreso total. El progreso de la fase de subida SHALL reflejar los bytes realmente enviados.

#### Scenario: Encolar varios videos
- **WHEN** el operador selecciona uno o más videos para subir
- **THEN** cada video aparece en la cola como `pendiente`
- **AND** el operador puede iniciar la subida de la cola

#### Scenario: Progreso de subida visible
- **WHEN** la subida de un archivo está en curso
- **THEN** la interfaz muestra el porcentaje del archivo y el progreso total de la cola

#### Scenario: Transición a la fase de procesamiento
- **WHEN** termina el envío de los bytes de un archivo
- **THEN** el archivo pasa al estado `procesando` mientras el nodo lo normaliza
- **AND** el archivo pasa a `completado` cuando el procesamiento finaliza

#### Scenario: Un archivo con error no frena la cola
- **WHEN** un archivo de la cola falla durante la subida o el procesamiento
- **THEN** ese archivo se marca como `error` con un mensaje visible
- **AND** los demás archivos de la cola continúan procesándose

#### Scenario: Archivo no válido
- **WHEN** el operador selecciona un archivo que no es un video soportado
- **THEN** el sistema lo informa con un mensaje claro y no lo sube
