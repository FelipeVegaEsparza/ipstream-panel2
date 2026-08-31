## Purpose

Registro de la URL del sitio web público de cada cliente (configurada únicamente por el administrador) y acceso a ese sitio desde el dashboard del cliente mediante el botón "Ir a mi sitio Web".

## ADDED Requirements

### Requirement: El administrador registra la URL del sitio web del cliente
El sistema SHALL permitir al administrador configurar la URL del sitio web público de cada cliente, de forma opcional y validada, desde el formulario de edición del cliente en el panel de administración.

#### Scenario: Registrar la URL del sitio web
- **WHEN** el administrador edita un cliente y guarda una URL válida en el campo "Sitio web del cliente"
- **THEN** la URL queda asociada a los datos básicos del cliente

#### Scenario: Dejar el sitio web sin URL
- **WHEN** el administrador deja vacío el campo "Sitio web del cliente" o lo borra
- **THEN** el cliente no tiene URL de sitio web configurada y no se muestra el botón en su dashboard

#### Scenario: URL inválida
- **WHEN** el administrador intenta guardar una URL que no es válida
- **THEN** el sistema rechaza el guardado e informa del error

### Requirement: El cliente accede a su sitio web desde el dashboard
El sistema SHALL mostrar, en el header del dashboard del cliente, un botón "Ir a mi sitio Web" que abre en una pestaña nueva el sitio web público del cliente, siempre que el cliente tenga una URL configurada.

#### Scenario: Cliente con sitio web configurado
- **WHEN** un cliente con `websiteUrl` configurada abre su dashboard
- **THEN** el header muestra el botón "Ir a mi sitio Web"
- **AND** al pulsarlo se abre el sitio del cliente en una pestaña nueva

#### Scenario: Cliente sin sitio web configurado
- **WHEN** un cliente sin `websiteUrl` abre su dashboard
- **THEN** el botón "Ir a mi sitio Web" no se muestra
