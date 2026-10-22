# Spec Delta

## Purpose

Define qué aplicación o servicio atiende cada host de la plataforma CasterFly, cómo se comportan los dominios anteriores durante la transición y qué hosts pueden obtener certificado TLS.

## ADDED Requirements

### Requirement: Mapa de hosts de la plataforma
El sistema SHALL enrutar cada host explícito a su servicio: `casterfly.com` al sitio público, `panel.casterfly.com` al panel y sus APIs, y `stream.casterfly.com` a Icecast. Cualquier otro host no listado SHALL evaluarse como sitio de cliente.

#### Scenario: Sitio público en la raíz
- **WHEN** un navegador solicita `https://casterfly.com/`
- **THEN** recibe el sitio público de CasterFly, no el login ni el shell de un cliente

#### Scenario: Panel en su subdominio
- **WHEN** un navegador solicita `https://panel.casterfly.com/auth/login`
- **THEN** recibe el panel y sus rutas de autenticación

#### Scenario: Stream en su subdominio
- **WHEN** un reproductor solicita `https://stream.casterfly.com/<mount>`
- **THEN** la petición se atiende contra Icecast

#### Scenario: Host de cliente
- **WHEN** un navegador solicita un subdominio `label.casterfly.com` registrado como sitio de cliente activo
- **THEN** recibe el shell del sitio del cliente correspondiente

#### Scenario: Host desconocido
- **WHEN** un navegador solicita un host que no es de la plataforma ni un dominio de cliente activo
- **THEN** no se sirve el panel ni el sitio público y la capa TLS rechaza la emisión

### Requirement: Redirección de www
El sistema SHALL redirigir `www.casterfly.com` al host canónico `casterfly.com`, preservando ruta y query string.

#### Scenario: Acceso con www
- **WHEN** un navegador solicita `https://www.casterfly.com/planes?moneda=USD`
- **THEN** recibe una redirección permanente a `https://casterfly.com/planes?moneda=USD`

### Requirement: Aislamiento entre sitio público y panel
El host público NO SHALL servir rutas privadas del panel (`/dashboard`, `/admin`) ni sus APIs autenticadas. Esas rutas SHALL existir únicamente en `panel.casterfly.com`.

#### Scenario: Ruta privada desde el sitio público
- **WHEN** un navegador solicita `https://casterfly.com/dashboard`
- **THEN** no accede al dashboard; recibe una redirección al panel o una respuesta no encontrada

#### Scenario: API privada desde el sitio público
- **WHEN** un cliente solicita una API autenticada del panel desde `casterfly.com`
- **THEN** la petición no se atiende como si fuera el panel

### Requirement: Compatibilidad con el panel anterior
El sistema SHALL redirigir las páginas de `panelipstream.cl` a `panel.casterfly.com` preservando ruta y query string. Las peticiones a `/api/*` del dominio anterior SHALL seguir llegando al panel mientras existan PWA instaladas que las usen, sin convertirlas en redirecciones que rompan métodos HTTP.

#### Scenario: Página antigua del panel
- **WHEN** un navegador solicita `https://panelipstream.cl/planes/plan-radio-pro`
- **THEN** recibe una redirección permanente a la misma ruta en `panel.casterfly.com`

#### Scenario: API antigua desde una PWA instalada
- **WHEN** una PWA instalada solicita `https://panelipstream.cl/api/public/<clientId>/basic-data`
- **THEN** la petición se atiende contra el panel nuevo sin perder el método ni los encabezados CORS

#### Scenario: Envío POST a una API antigua
- **WHEN** una PWA instalada envía un `POST` a una ruta `/api/*` del dominio anterior
- **THEN** el panel nuevo recibe un `POST`, no un `GET` por redirección

### Requirement: Compatibilidad con el stream anterior
El sistema SHALL seguir atendiendo `stream.panelipstream.cl` contra Icecast durante la transición, para no romper reproductores ni embeds con URLs guardadas.

#### Scenario: Reproductor con URL antigua
- **WHEN** un reproductor solicita `https://stream.panelipstream.cl/<mount>`
- **THEN** recibe el audio de Icecast igual que antes de la migración

### Requirement: Certificados TLS acotados
El sistema SHALL emitir certificados para los hosts explícitos de la plataforma y para dominios de clientes registrados y activos. NO SHALL emitir certificados para hosts arbitrarios que apunten al servidor.

#### Scenario: Certificado del sitio público
- **WHEN** se solicita `https://casterfly.com` por primera vez
- **THEN** el certificado se emite para el host público y la conexión no falla

#### Scenario: Certificado de cliente activo
- **WHEN** se solicita un subdominio de cliente registrado y activo
- **THEN** el certificado se emite para ese host

#### Scenario: Host arbitrario
- **WHEN** un host no registrado apunta al servidor y solicita TLS
- **THEN** la emisión se rechaza

### Requirement: URLs absolutas en el host correcto
Las URLs absolutas que el panel genera para usuarios, correos, PDFs, pagos y streaming SHALL usar `panel.casterfly.com` o `stream.casterfly.com` según corresponda, nunca los dominios anteriores.

#### Scenario: Enlace en correo transaccional
- **WHEN** el panel envía un correo con un enlace al dashboard o a un pago
- **THEN** el enlace apunta a `https://panel.casterfly.com/...`

#### Scenario: URL de radio o TV
- **WHEN** el panel entrega la URL pública de radio o TV de un cliente
- **THEN** la URL usa `stream.casterfly.com` o el host público que corresponda, no `panelipstream.cl`
