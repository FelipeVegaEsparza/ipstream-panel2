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
