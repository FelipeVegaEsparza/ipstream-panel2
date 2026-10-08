# Spec Delta

## Purpose

Capturar el nombre de la radio en el registro público y usarlo para crear automáticamente el subdominio del sitio del cliente (`<nombre>.ipstream.cl`), mostrando su disponibilidad y comunicando la URL en el correo de bienvenida.

## ADDED Requirements

### Requirement: Campo obligatorio "Nombre de la radio"
El formulario de registro público SHALL incluir un campo de **nombre de la radio**, obligatorio, que se usará como base para el subdominio del cliente. El formulario SHALL mostrar una vista previa del subdominio resultante (`https://<slug>.ipstream.cl`).

#### Scenario: Registro sin nombre de radio
- **WHEN** el usuario intenta completar el registro sin ingresar el nombre de la radio
- **THEN** el sistema no permite continuar e indica que el campo es obligatorio

#### Scenario: Vista previa del subdominio
- **WHEN** el usuario escribe el nombre de la radio
- **THEN** el formulario muestra el subdominio que se creará a partir de ese nombre

### Requirement: Deriva y valida el slug del subdominio
El sistema SHALL derivar un slug a partir del nombre de la radio (minúsculas, sin acentos, sin espacios, sólo `a-z0-9-`) y SHALL rechazar slugs inválidos o **reservados** (infraestructura de la plataforma).

#### Scenario: Nombre con acentos y espacios
- **WHEN** el nombre de la radio es "Radio Corazón Ñuñoa"
- **THEN** el slug resultante es válido para un subdominio DNS (p. ej. `radio-corazon-nunoa`)

#### Scenario: Nombre reservado
- **WHEN** el slug coincide con un nombre reservado (p. ej. `panel`, `stream`, `www`, `admin`)
- **THEN** el sistema lo rechaza con un mensaje claro

### Requirement: Chequeo de disponibilidad del subdominio
El sistema SHALL exponer un endpoint público que, dado un nombre, devuelva el slug normalizado y si el subdominio está disponible, ocupado o reservado, sin crear nada.

#### Scenario: Disponible
- **WHEN** se consulta un nombre cuyo slug no está registrado ni reservado
- **THEN** el sistema responde que está disponible y el slug resultante

#### Scenario: Ocupado
- **WHEN** se consulta un nombre cuyo slug ya corresponde a un dominio registrado
- **THEN** el sistema responde que no está disponible

### Requirement: Creación automática del subdominio al registrarse
Al completar el registro, el sistema SHALL crear el dominio del cliente con el slug derivado como `subdomain`, `active` y `isPrimary`, de forma atómica con la creación de la cuenta. Si el slug ya está tomado, SHALL rechazar el registro sin crear la cuenta.

#### Scenario: Registro exitoso
- **WHEN** un usuario se registra con un nombre de radio disponible
- **THEN** el sistema crea su cuenta y su subdominio `active`, y lo deja como dominio primario

#### Scenario: Subdominio tomado
- **WHEN** un usuario se registra con un nombre cuyo slug ya está registrado por otro cliente
- **THEN** el sistema rechaza el registro e informa que el nombre no está disponible, sin crear la cuenta

### Requirement: El nombre de la radio queda como nombre del proyecto
El sistema SHALL registrar el nombre de la radio como `projectName` de los datos básicos del cliente, de modo que su sitio muestre ese nombre desde el primer momento.

#### Scenario: Proyecto con el nombre de la radio
- **WHEN** el registro se completa con el nombre "Radio Corazón"
- **THEN** los datos básicos del cliente tienen `projectName` "Radio Corazón"

### Requirement: Email de bienvenida con la URL del sitio
El correo de bienvenida SHALL incluir la URL del sitio del cliente (`https://<slug>.ipstream.cl`).

#### Scenario: Bienvenida con enlace al sitio
- **WHEN** se envía el correo de bienvenida tras el registro
- **THEN** el correo incluye la URL del sitio del cliente
