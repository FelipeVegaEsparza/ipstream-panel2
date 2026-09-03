## Purpose

Permite guardar y exponer la ubicación geográfica de una radio (ciudad, región, país ISO y coordenadas) configurada desde el dashboard con geocodificación automática global, para que los sitios públicos de cada radio puedan mostrar el clima de su ciudad.

## ADDED Requirements

### Requirement: Configurar la ciudad de la radio con autocompletado global

El dashboard del cliente (Datos Básicos) SHALL permitir escribir una ciudad y elegir de una lista de sugerencias de ciudades de **cualquier país del mundo**. Al elegir una sugerencia, el sistema SHALL resolver automáticamente la ubicación (`city`, `region`, `country` en código ISO de 2 letras, `latitude`, `longitude`) desde el geocoder del panel y mostrarla como seleccionada.

#### Scenario: El admin escribe una ciudad local

- **WHEN** el usuario escribe el nombre de una ciudad en el campo de Datos Básicos
- **THEN** el panel le muestra una lista de sugerencias con el formato "ciudad, región, país" correspondiente a esa búsqueda

#### Scenario: Autocompletado global (ciudad de otro continente)

- **WHEN** el usuario busca una ciudad fuera del país del panel (p. ej. en otro continente)
- **THEN** el panel devuelve sugerencias de esa ciudad sin restricciones de región

#### Scenario: Elegir una sugerencia resuelve la ubicación

- **WHEN** el usuario elige una sugerencia y guarda los datos básicos
- **THEN** el sistema persiste `city`, `region`, `country` (ISO 2 letras), `latitude` y `longitude` de la sugerencia elegida

#### Scenario: Quitar la ciudad configurada

- **WHEN** el usuario quita la ciudad seleccionada y guarda
- **THEN** la ubicación queda en `null` (sin ciudad configurada)

### Requirement: Guardado validado de la ubicación

El endpoint de guardado de datos básicos SHALL aceptar la ubicación como un objeto `location`. Si `location` viene presente, `city` SHALL ser requerido y `country` SHALL ser un código ISO de 2 letras; `latitude` y `longitude` SHALL ser números en rango válido. Si el payload no incluye `location`, el sistema SHALL conservar la ubicación previa (no pisarla). Un `location: null` explícito SHALL limpiar la ubicación.

#### Scenario: Guardar con ubicación válida

- **WHEN** el usuario guarda con un `location` válido (city, country ISO, lat/lon en rango)
- **THEN** el sistema persiste la ubicación sin error

#### Scenario: Guardar con ubicación inválida

- **WHEN** el usuario guarda con un `location` que no incluye `city`, o con `country` que no es ISO de 2 letras, o lat/lon fuera de rango
- **THEN** el sistema responde un error de validación (400) y no modifica la ubicación guardada

#### Scenario: Guardar sin tocar la ubicación

- **WHEN** el usuario guarda datos básicos sin incluir el campo `location` en el payload
- **THEN** el sistema conserva los valores de ubicación ya guardados

### Requirement: La ubicación se expone igual en los endpoints públicos

`GET /api/public/{clientId}/basic-data` y el `basicData` del payload completo `GET /api/public/{clientId}` SHALL incluir un objeto `location` con `city`, `region`, `country`, `latitude` y `longitude`, calculado por la misma serialización compartida. Si el cliente no tiene ciudad configurada, ambos endpoints SHALL devolver `location: null`.

#### Scenario: Cliente con ciudad configurada

- **WHEN** un cliente con ubicación configurada consulta `/api/public/{clientId}/basic-data` y `/api/public/{clientId}`
- **THEN** ambos endpoints devuelven el mismo objeto `location` con ciudad, región, país y coordenadas

#### Scenario: Cliente sin ciudad configurada

- **WHEN** un cliente sin ubicación consulta cualquiera de los dos endpoints
- **THEN** ambos endpoints devuelven `location: null`
