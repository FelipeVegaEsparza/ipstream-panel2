# Spec Delta

## Purpose

Servir, por dominio, el shell y los metadatos del sitio del cliente (HTML con Open Graph, manifest de PWA e iconos) a partir de un único bundle de la PWA, resolviendo el branding en el servidor.

## ADDED Requirements

### Requirement: Documento HTML por dominio con metadatos del cliente
El sistema SHALL servir, en el host de un dominio activo, un `index.html` cuyo `<title>` y metadatos Open Graph/Twitter (título, descripción, imagen) correspondan a los datos del cliente resuelto. El documento SHALL cargar el bundle único de la PWA.

#### Scenario: Dominio de cliente con datos
- **WHEN** un navegador pide la raíz de un dominio activo de un cliente con datos básicos
- **THEN** el HTML servido incluye el nombre del proyecto y la imagen de portada del cliente en sus metadatos
- **AND** referencia el bundle único de la PWA

#### Scenario: Datos del cliente incompletos
- **WHEN** el cliente no tiene imagen o descripción configurada
- **THEN** el HTML se sirve igual, con el nombre del cliente y omitiendo los metadatos que no puedan resolverse

### Requirement: Manifest de PWA dinámico por cliente
El sistema SHALL servir `manifest.webmanifest` por dominio con el nombre, nombre corto, color de tema y lista de iconos del cliente resuelto. Los nombres de archivo de los iconos SHALL ser estables (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`).

#### Scenario: Manifest de un cliente con branding
- **WHEN** se pide el manifest en el dominio de un cliente
- **THEN** el manifest usa el nombre y color del cliente y apunta a sus iconos en el mismo origen

#### Scenario: Cliente sin iconos propios
- **WHEN** el cliente no tiene iconos propios configurados
- **THEN** el manifest apunta a los iconos compartidos por defecto

### Requirement: Iconos de marca por dominio
El sistema SHALL servir los iconos del cliente (`favicon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`) en el host de su dominio, con los iconos compartidos como respaldo.

#### Scenario: Favicon del cliente
- **WHEN** se pide `/favicon.png` en el dominio de un cliente con logo configurado
- **THEN** el sistema devuelve la imagen del cliente

### Requirement: Assets compartidos y fallback de SPA
El sistema SHALL servir los recursos estáticos del bundle único (JS, CSS, service worker, `offline.html`) para todos los dominios, y SHALL devolver el documento de la aplicación ante rutas internas de la SPA que no correspondan a archivos estáticos.

#### Scenario: Navegación interna de la SPA
- **WHEN** un usuario abre una ruta interna del cliente (por ejemplo `/noticias/123`) directamente
- **THEN** el sistema sirve el documento de la aplicación y la SPA resuelve la ruta

#### Scenario: Asset estático compartido
- **WHEN** se pide un archivo del bundle (`/assets/...`) desde cualquier dominio
- **THEN** el sistema devuelve el mismo recurso compartido

### Requirement: Host sin cliente
El sistema SHALL responder de forma informativa (sin error de servidor) cuando se accede a un host que no corresponde a ningún cliente activo.

#### Scenario: Dominio desconocido
- **WHEN** un navegador abre un host que no resuelve a un cliente activo
- **THEN** el sistema responde con una página informativa de "sitio no configurado"
