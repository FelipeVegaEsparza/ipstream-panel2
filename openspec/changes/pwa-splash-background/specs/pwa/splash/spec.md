# Spec Delta

## Purpose

Permite a cada cliente configurar una imagen de fondo para el splash (pantalla de carga) de su PWA, de modo que al abrir la app se muestre su imagen de marca en vez del fondo sólido por defecto.

## ADDED Requirements

### Requirement: Configuración del fondo del splash por cliente
El panel SHALL permitir al cliente cargar una imagen que se use como fondo del splash de su PWA, y SHALL persistir su URL junto a los datos básicos del cliente.

#### Scenario: Cliente carga una imagen
- **WHEN** el cliente sube una imagen en la sección de splash de Datos básicos y guarda
- **THEN** la URL de la imagen queda persistida en sus datos básicos

#### Scenario: Cliente quita la imagen
- **WHEN** el cliente elimina la imagen de splash y guarda
- **THEN** el splash vuelve a usar el fondo por defecto

#### Scenario: Cliente sin imagen configurada
- **WHEN** el cliente no tiene imagen de splash
- **THEN** el splash usa el fondo por defecto (color del tema), sin errores

### Requirement: Optimización de la imagen de splash al subir
El sistema SHALL convertir la imagen de splash a formato WebP y redimensionarla a un lienzo vertical (recorte centrado) antes de guardarla.

#### Scenario: Subida de imagen de splash
- **WHEN** el cliente sube una imagen como fondo del splash (en cualquier formato de imagen soportado)
- **THEN** la imagen guardada es WebP y tiene relación de aspecto vertical
- **AND** la URL persistida en los datos básicos apunta al archivo optimizado

### Requirement: Aplicación de la imagen en el splash de la PWA
La PWA SHALL mostrar la imagen configurada como fondo de la pantalla de carga, cubriendo la pantalla, tanto en el splash inicial (HTML previo a React) como en el loader mientras carga el contenido.

#### Scenario: Apertura con imagen configurada
- **WHEN** el oyente abre la PWA de un cliente con imagen de splash
- **THEN** el splash muestra esa imagen cubriendo la pantalla
- **AND** la imagen se mantiene durante el loader hasta que monta el contenido

#### Scenario: Imagen ausente o con error de carga
- **WHEN** no hay imagen de splash o la imagen no carga
- **THEN** el splash muestra el fondo por defecto

### Requirement: Exposición en la API pública
La imagen de splash del cliente SHALL estar disponible en el payload público del cliente para el sitio/PWA.

#### Scenario: Payload público incluye la imagen
- **WHEN** se consulta el contenido público del cliente
- **THEN** el bloque `basicData` incluye `splashBackgroundUrl` (o `null` si no está configurada)

### Requirement: Presentación del splash
El splash SHALL mostrar el fondo (imagen o color) con un desenfoque suave para que el logo se distinga nítido por encima, y SHALL permanecer visible un tiempo mínimo configurable (~6 segundos).

#### Scenario: Fondo desenfocado y logo nítido
- **WHEN** se muestra el splash de un cliente con imagen de fondo
- **THEN** el fondo se ve desenfocado y suavizado
- **AND** el logo se ve nítido por encima

#### Scenario: Duración mínima del splash
- **WHEN** el oyente abre la PWA
- **THEN** el splash permanece visible al menos el tiempo mínimo configurado (~6 s), aunque el contenido cargue antes
