# Spec Delta

## Purpose

Muestra los banners promocionales del cliente en la parte superior del contenido del sitio público, con un carrusel accesible cuando hay varios, en todos los templates de la PWA.

## ADDED Requirements

### Requirement: Ubicación en todos los templates

La PWA SHALL mostrar los banners en el home, por encima de las demás secciones de contenido y después del encabezado o hero propio de cada template. La misma presentación SHALL aplicar a todos los templates soportados sin requerir cambios manuales por template.

#### Scenario: Template con banners

- **WHEN** un cliente con banners abre el home de su sitio en cualquier template
- **THEN** los banners aparecen antes del resto de las secciones de contenido

#### Scenario: Template sin banners

- **WHEN** el cliente no tiene banners cargados
- **THEN** el sitio no reserva espacio ni muestra un contenedor vacío para banners

#### Scenario: Páginas internas

- **WHEN** el visitante navega a una página de listado o detalle de contenido
- **THEN** el banner del home no se repite en esa página

### Requirement: Presentación de un banner individual

Cada banner SHALL mostrar su imagen. Si el banner tiene un enlace, al activarlo el navegador SHALL abrir ese enlace en una pestaña nueva. Si no tiene enlace, la imagen SHALL mostrarse sin comportamiento de clic ni foco interactivo.

#### Scenario: Banner con enlace

- **WHEN** el visitante hace clic en un banner que tiene enlace
- **THEN** el enlace se abre en una pestaña nueva sin reemplazar el sitio actual

#### Scenario: Banner sin enlace

- **WHEN** el visitante ve un banner sin enlace
- **THEN** la imagen se muestra como contenido no interactivo

#### Scenario: Enlace externo seguro

- **WHEN** se renderiza un banner con enlace
- **THEN** el enlace usa `target="_blank"` y `rel="noopener noreferrer"`

### Requirement: Carrusel con varios banners

Cuando el cliente tiene dos o más banners, la PWA SHALL presentarlos en un carrusel que muestra un banner a la vez y SHALL ofrecer controles para avanzar y retroceder, además de indicadores de la posición actual. El carrusel SHALL rotar automáticamente y SHALL pausar la rotación mientras el visitante interactúa con él o mantiene el foco dentro del carrusel.

#### Scenario: Varios banners

- **WHEN** el cliente tiene dos o más banners
- **THEN** la PWA muestra un carrusel con un banner visible y controles de navegación

#### Scenario: Navegación manual

- **WHEN** el visitante usa los controles anterior o siguiente, o selecciona un indicador
- **THEN** el carrusel muestra el banner correspondiente y actualiza el indicador activo

#### Scenario: Pausa por interacción

- **WHEN** el visitante enfoca un control del carrusel o mantiene el puntero sobre él
- **THEN** la rotación automática se detiene mientras dure esa interacción

#### Scenario: Un solo banner

- **WHEN** el cliente tiene un único banner
- **THEN** la PWA lo muestra como imagen estática sin controles de carrusel

### Requirement: Accesibilidad del carrusel

El carrusel SHALL ser usable con teclado, SHALL identificar sus controles con nombres accesibles y SHALL respetar la preferencia `prefers-reduced-motion` desactivando la rotación automática y las transiciones animadas.

#### Scenario: Navegación por teclado

- **WHEN** el visitante navega con teclado por el carrusel
- **THEN** puede enfocar y activar los controles anterior, siguiente e indicadores

#### Scenario: Movimiento reducido

- **WHEN** el sistema operativo del visitante indica `prefers-reduced-motion: reduce`
- **THEN** el carrusel no rota automáticamente ni anima la transición entre banners

#### Scenario: Imagen no disponible

- **WHEN** la imagen de un banner no se puede cargar
- **THEN** ese banner no se muestra y el carrusel continúa con los banners disponibles o se oculta si no queda ninguno
