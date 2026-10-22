# Spec Delta

## Purpose

Define la identidad visible de la plataforma como CasterFly en panel, autenticación, PWA, correos y documentos, manteniendo la paleta celeste/azul existente.

## ADDED Requirements

### Requirement: Nombre y logo visibles
Las superficies visibles para usuarios del panel (login, dashboard, administración, títulos de página y navegación) SHALL mostrar el nombre **CasterFly** y el logo CasterFly. El logo horizontal SHALL usarse en encabezados y el isotipo en iconos y favicons.

#### Scenario: Login del panel
- **WHEN** un usuario abre `https://panel.casterfly.com/auth/login`
- **THEN** la pantalla muestra el logo CasterFly y el título de CasterFly, no IPStream

#### Scenario: Título del panel
- **WHEN** un usuario navega el panel
- **THEN** el título del documento y los metadatos usan CasterFly

#### Scenario: Favicon
- **WHEN** el navegador solicita el favicon del panel
- **THEN** recibe el isotipo de CasterFly

### Requirement: Sin marca IPStream en superficies de usuario
Las superficies visibles para usuarios NO SHALL mostrar el nombre IPStream ni correos `@ipstream.cl`/`@ipstream.com` como marca principal. Los nombres internos de infraestructura (contenedores, base de datos, repo) no se consideran superficies de usuario y pueden conservarse.

#### Scenario: Texto de soporte
- **WHEN** un usuario abre la ayuda o el soporte del panel
- **THEN** los enlaces y correos de contacto usan el dominio CasterFly

#### Scenario: Correo transaccional
- **WHEN** el panel envía un correo de bienvenida, boleta o soporte
- **THEN** el remitente, el pie y los enlaces usan CasterFly, no IPStream

#### Scenario: PDF de cuenta
- **WHEN** un cliente descarga su cuenta en PDF
- **THEN** el documento muestra el logo y los datos de contacto de CasterFly

### Requirement: Marca en la PWA de clientes
El bundle de la PWA y los metadatos por defecto SHALL mostrar CasterFly cuando el cliente no tenga branding propio, y SHALL conservar el branding del cliente cuando lo tenga.

#### Scenario: Sitio sin branding de cliente
- **WHEN** se sirve la PWA de un cliente sin logo ni nombre configurado
- **THEN** el nombre por defecto y el splash muestran CasterFly

#### Scenario: Sitio con branding de cliente
- **WHEN** el cliente tiene nombre y logo configurados
- **THEN** la PWA sigue mostrando el branding del cliente y no lo reemplaza por CasterFly

### Requirement: Paleta de marca sin cambios
La identidad CasterFly SHALL conservar los tokens de marca actuales (celeste `#28B4F0`, azul `#0050B4`, `--brand-grad`) y el sistema de superficies/temas existente. El cambio de logo NO SHALL introducir una paleta nueva ni gradientes adicionales en componentes.

#### Scenario: Componentes del panel
- **WHEN** se reemplaza el logo en el panel
- **THEN** los botones, enlaces y estados siguen usando los tokens `brand` actuales

#### Scenario: Tema claro y oscuro
- **WHEN** se cambia el tema del panel
- **THEN** el logo y los tokens de marca se muestran correctamente en ambos temas
