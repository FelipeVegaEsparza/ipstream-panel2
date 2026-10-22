# Spec Delta

## Purpose

Define el dominio base de los sitios de clientes en CasterFly, cómo se migran y resuelven los dominios existentes, y qué origen usa la PWA para hablar con la API pública.

## ADDED Requirements

### Requirement: Dominio base de sitios de clientes
El sistema SHALL usar `casterfly.com` como dominio base de los subdominios de clientes. Un cliente nuevo con slug `radio-x` SHALL quedar accesible en `radio-x.casterfly.com`. Los labels de infraestructura (`panel`, `stream`, `www`, `admin`, `clientes`, `api`, entre otros reservados) NO SHALL asignarse a clientes.

#### Scenario: Alta de cliente nuevo
- **WHEN** un cliente se registra con el nombre de radio "Radio X" y el slug `radio-x` está disponible
- **THEN** su dominio primario es `radio-x.casterfly.com`

#### Scenario: Slug reservado
- **WHEN** el nombre de radio produce un slug reservado como `panel` o `stream`
- **THEN** el registro se rechaza y se informa que el nombre no está disponible

### Requirement: Configuración efectiva del dominio base
El sistema SHALL obtener el dominio base y el target de DNS desde la configuración de plataforma, dando prioridad a los valores guardados en `app_config` sobre las variables de entorno. El registro, la provisión DNS y los enlaces generados SHALL usar la configuración efectiva.

#### Scenario: Valor en dashboard
- **WHEN** `app_config.clientSitesDomain` tiene `casterfly.com` y el env tiene otro valor
- **THEN** el registro y los enlaces usan `casterfly.com`

#### Scenario: Sin valor en dashboard
- **WHEN** `app_config.clientSitesDomain` está vacío y el env define `casterfly.com`
- **THEN** el sistema usa `casterfly.com`

### Requirement: Migración de dominios existentes con alias
Los dominios de clientes de tipo `subdomain` registrados como `label.ipstream.cl` SHALL conservar su operación y SHALL agregarse `label.casterfly.com` como dominio primario del mismo cliente. La resolución por host SHALL devolver el mismo cliente para el host nuevo y para el antiguo mientras el alias esté activo.

#### Scenario: Cliente existente después de la migración
- **WHEN** un cliente tenía `radio-x.ipstream.cl` como primario
- **THEN** pasa a tener `radio-x.casterfly.com` como primario y `radio-x.ipstream.cl` sigue resolviendo al mismo cliente

#### Scenario: Dominio custom existente
- **WHEN** un cliente tiene un dominio custom activo como `radio-x.com`
- **THEN** el dominio custom no se modifica y sigue resolviendo al mismo cliente

#### Scenario: Resolución del host antiguo
- **WHEN** se consulta `radio-x.ipstream.cl` después de la migración
- **THEN** la resolución devuelve el mismo `clientId` que `radio-x.casterfly.com`

### Requirement: Target DNS de la plataforma
El sistema SHALL provisionar los subdominios de clientes contra el target configurado `clientes.casterfly.com` dentro de la zona `casterfly.com`, o apoyarse en el wildcard `*.casterfly.com` cuando exista.

#### Scenario: Provisión de subdominio
- **WHEN** se activa un subdominio `radio-x.casterfly.com` y no hay wildcard
- **THEN** el sistema crea un registro DNS en la zona `casterfly.com` hacia el target configurado

#### Scenario: Wildcard existente
- **WHEN** el wildcard `*.casterfly.com` ya existe
- **THEN** el sistema no crea registros duplicados y considera el subdominio cubierto

### Requirement: URL pública del cliente
La URL del sitio que el sistema muestra o envía a un cliente SHALL ser la de su dominio primario. Después de la migración, un cliente con alias nuevo y viejo SHALL mostrar `https://label.casterfly.com`, no el host anterior.

#### Scenario: Enlace al sitio del cliente
- **WHEN** el panel muestra el enlace "Ir a mi sitio" de un cliente migrado
- **THEN** el enlace usa `https://label.casterfly.com`

#### Scenario: Correo de bienvenida de un cliente nuevo
- **WHEN** se envía el correo de bienvenida a un cliente nuevo
- **THEN** la URL del sitio en el correo usa `https://label.casterfly.com`

### Requirement: Origen de API de la PWA
La PWA de clientes SHALL resolver la API pública contra `panel.casterfly.com` o contra el mismo origen del sitio, según su configuración de build. NO SHALL usar `panelipstream.cl` como origen por defecto. El service worker SHALL cachear únicamente el origen de API configurado.

#### Scenario: Bundle único de producción
- **WHEN** se construye y publica el bundle único de la PWA
- **THEN** las llamadas a `/api/public/*` y a `resolve-domain` apuntan al origen configurado de CasterFly

#### Scenario: Cache del service worker
- **WHEN** el service worker evalúa una petición a la API pública
- **THEN** solo la cachea si el host coincide con el origen de API configurado

#### Scenario: Sitio de cliente en host nuevo
- **WHEN** un navegador abre `radio-x.casterfly.com`
- **THEN** la PWA resuelve el tenant consultando el panel nuevo y muestra el sitio del cliente
