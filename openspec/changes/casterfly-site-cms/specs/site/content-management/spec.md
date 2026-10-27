# Spec Delta

## Purpose

Define cómo el panel administra el contenido editorial del sitio público de CasterFly y cómo el sitio lo recibe por idioma, con publicación directa, caché corta y fallback al contenido actual cuando el panel no está disponible.

## ADDED Requirements

### Requirement: Administración del contenido desde el panel

La sección **Sitio público** del panel SHALL estar disponible únicamente para usuarios con rol `ADMIN`. Desde ella SHALL poder consultarse el contenido publicado, editarlo y guardarlo. La página y las APIs de escritura NO SHALL aceptar usuarios sin rol `ADMIN`.

#### Scenario: Acceso de administrador

- **WHEN** un usuario `ADMIN` abre la sección Sitio público
- **THEN** ve el contenido actual y puede editarlo y guardarlo

#### Scenario: Acceso denegado

- **WHEN** un usuario sin rol `ADMIN` intenta abrir la página o llamar a la API de escritura
- **THEN** la página no muestra el editor y la API responde no autorizado

#### Scenario: Guardado exitoso

- **WHEN** el administrador guarda contenido válido
- **THEN** el contenido queda persistido y marcado como la versión publicada

### Requirement: Alcance del contenido editorial

El contenido administrable SHALL incluir el hero principal, los encabezados y textos de las secciones, las tarjetas de pilares, funcionalidades, IA, Studio y reproductores, el FAQ, las tarjetas de soporte, el SEO por página, los datos de contacto y las redes sociales. La sección NO SHALL administrar planes, noticias, tutoriales, portafolio ni mensajes de contacto en esta fase.

#### Scenario: Editar el hero

- **WHEN** el administrador modifica el badge, título, descripción o CTAs del hero
- **THEN** el sitio público muestra los nuevos valores en la portada

#### Scenario: Contenido fuera de alcance

- **WHEN** el administrador abre la sección Sitio público
- **THEN** no encuentra controles para editar planes, noticias, tutoriales, portafolio ni mensajes de contacto

#### Scenario: Campo inválido

- **WHEN** el administrador envía un campo fuera del esquema o con un formato inválido
- **THEN** el guardado se rechaza con un error y no se modifica el contenido publicado

### Requirement: Contenido en español e inglés

El sistema SHALL almacenar el contenido editorial en español e inglés de forma independiente. El sitio SHALL mostrar el idioma seleccionado por el visitante; si un campo no existe en ese idioma SHALL usar el valor en español y, si tampoco existe, el contenido estático actual.

#### Scenario: Editar ambos idiomas

- **WHEN** el administrador guarda textos distintos para español e inglés
- **THEN** la versión española y la inglesa del sitio muestran sus respectivos textos

#### Scenario: Inglés incompleto

- **WHEN** el sitio se muestra en inglés y un campo no tiene traducción
- **THEN** ese campo usa el valor en español sin romper el resto de la página

#### Scenario: Sin contenido publicado

- **WHEN** no existe contenido editorial publicado para un idioma
- **THEN** el sitio usa el contenido estático actual como fallback

### Requirement: Publicación directa

Guardar contenido válido SHALL publicarlo de inmediato, sin flujo de borrador ni aprobación en esta fase. El sitio público SHALL reflejar la nueva versión dentro de la ventana de caché definida, sin requerir un redespliegue.

#### Scenario: Publicar un cambio

- **WHEN** el administrador guarda un cambio válido
- **THEN** el sitio lo muestra dentro del tiempo máximo de caché configurado

#### Scenario: Guardado inválido

- **WHEN** el administrador intenta guardar contenido inválido
- **THEN** la versión publicada anterior permanece intacta

#### Scenario: Sin redeploy

- **WHEN** el administrador publica un cambio de texto o imagen
- **THEN** no es necesario volver a desplegar el sitio para verlo

### Requirement: API pública de contenido

El sistema SHALL exponer una API pública de solo lectura que entregue el contenido editorial publicado para un idioma. La API SHALL aceptar `es` y `en`, usar español cuando el idioma no sea válido, enviar cabeceras CORS y declarar una caché corta. Cuando no haya contenido publicado SHALL responder correctamente con contenido nulo para permitir el fallback del sitio.

#### Scenario: Lectura en español

- **WHEN** un consumidor solicita el contenido con idioma `es`
- **THEN** recibe el contenido publicado en español con su versión y fecha de actualización

#### Scenario: Idioma desconocido

- **WHEN** un consumidor solicita un idioma no soportado
- **THEN** recibe el contenido en español

#### Scenario: Sin contenido

- **WHEN** no hay contenido publicado
- **THEN** la API responde sin error y el consumidor puede aplicar su fallback

#### Scenario: Caché

- **WHEN** la API entrega contenido publicado
- **THEN** la respuesta incluye cabeceras de caché pública de corta duración

### Requirement: Consumo con fallback en el sitio

El sitio público SHALL consultar la API del panel en tiempo de ejecución. Si la API no responde, devuelve datos inválidos o no hay contenido publicado, el sitio SHALL seguir renderizando con el contenido estático actual. El sitio NO SHALL quedar en blanco ni fallar por un problema del panel.

#### Scenario: Panel disponible

- **WHEN** el sitio carga una página y la API del panel responde con contenido válido
- **THEN** renderiza el contenido publicado por el panel

#### Scenario: Panel caído

- **WHEN** la API del panel no responde o devuelve un error
- **THEN** el sitio renderiza el contenido estático actual sin romper la página

#### Scenario: Respuesta incompleta

- **WHEN** la API devuelve solo una parte del contenido
- **THEN** el sitio completa los campos faltantes con el fallback sin romper el diseño

### Requirement: Imágenes del contenido

El administrador SHALL poder subir imágenes desde el panel o reutilizar URLs existentes para el contenido del sitio. Las URLs publicadas SHALL ser absolutas y accesibles desde casterfly.com. Si una imagen falta o no carga, el sitio SHALL mantener el layout y mostrar su placeholder o texto alternativo.

#### Scenario: Subir una imagen

- **WHEN** el administrador sube una imagen y la asigna a una tarjeta
- **THEN** el sitio muestra la imagen desde la URL pública del panel

#### Scenario: Imagen rota

- **WHEN** una URL de imagen deja de estar disponible
- **THEN** el sitio no rompe la página y conserva el espacio o placeholder previsto

### Requirement: Seguridad del contenido

La API de escritura SHALL exigir una sesión autenticada con rol `ADMIN` y SHALL validar el contenido contra un esquema antes de persistirlo. El contenido de texto SHALL mostrarse escapado en el sitio y NO SHALL permitir ejecutar HTML o scripts arbitrarios.

#### Scenario: Escritura no autorizada

- **WHEN** un visitante o cliente intenta escribir contenido
- **THEN** la API rechaza la operación y no modifica datos

#### Scenario: Intento de inyección

- **WHEN** un administrador guarda texto con etiquetas HTML o scripts
- **THEN** el sitio los muestra como texto escapado y no los ejecuta
