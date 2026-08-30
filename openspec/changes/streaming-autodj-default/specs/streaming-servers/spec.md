## ADDED Requirements

### Requirement: El administrador actualiza el código de un nodo provisionado
El sistema SHALL permitir al administrador actualizar el código de un nodo de streaming ya provisionado (agente, scripts de liquidsoap y compose) a la versión actual del repositorio, re-descargando el código, re-escribiendo la configuración del nodo y levantando el stack con rebuild. La actualización SHALL ser manual y explícita, y SHALL reportar su progreso.

#### Scenario: Actualizar un nodo provisionado
- **WHEN** el administrador pulsa "Actualizar nodo" en un servidor provisionado con acceso SSH configurado
- **THEN** el sistema descarga el código actual, lo copia al nodo, re-escribe su `.env`/Caddyfile/override y levanta el stack con `--build`
- **AND** el estado del nodo pasa a "Actualizando" y vuelve a "Listo" al completar

#### Scenario: Nodo sin acceso SSH
- **WHEN** el administrador intenta actualizar un nodo sin acceso SSH configurado
- **THEN** el sistema rechaza la actualización con un mensaje claro

#### Scenario: Actualización ya en curso
- **WHEN** el administrador intenta actualizar un nodo mientras ya hay un provisioning/actualización en curso
- **THEN** el sistema rechaza la segunda solicitud

#### Scenario: Fallo en la actualización
- **WHEN** falla la actualización del código o el levantamiento del stack
- **THEN** el nodo queda marcado como fallido con el error reportado, y el administrador puede reintentarlo

### Requirement: La actualización de un nodo reinicia los streams que estaban activos
El sistema SHALL reiniciar automáticamente, al completar la actualización de un nodo, los streams (radio y TV) que estaban activos (`autodj` o `live`) en ese servidor antes de la actualización. La actualización detiene los procesos de liquidsoap/encoder al recrear los contenedores; el sistema SHALL restaurarlos al terminar.

#### Scenario: Nodo con streams activos
- **WHEN** se actualiza un nodo que tenía radios o TVs en `autodj`/`live` antes de la actualización
- **THEN** al completar el update, el sistema reinicia esos streams vía el agente del nodo

#### Scenario: Nodo sin streams activos
- **WHEN** se actualiza un nodo que no tenía streams activos
- **THEN** no se intenta reiniciar nada y el update termina normalmente

#### Scenario: Fallo al reiniciar un stream
- **WHEN** tras el update falla el reinicio de alguno de los streams activos
- **THEN** el resto se reinicia igualmente y el update reporta cuáles fallaron (sin marcar el nodo como fallido si al menos uno se reinició)
