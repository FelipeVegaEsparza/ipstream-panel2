# Spec Delta

## Purpose

Registrar los dominios (subdominio propio o dominio custom) de cada cliente y resolver, a partir del host entrante, a qué cliente corresponde, para que un solo bundle sirva a todos.

## ADDED Requirements

### Requirement: Registro de dominios por cliente
El sistema SHALL permitir registrar uno o más dominios asociados a un cliente, indicando su tipo (`subdomain` o `custom`), con un estado (`pending` o `active`) y un token de verificación. El sistema SHALL permitir marcar un dominio como primario del cliente.

#### Scenario: Registrar un subdominio propio
- **WHEN** el administrador asigna a un cliente un subdominio de la plataforma (por ejemplo `radio-x.panelipstream.cl`)
- **THEN** el dominio queda asociado al cliente con tipo `subdomain` y estado `pending` hasta completarse la provisión

#### Scenario: Registrar un dominio custom
- **WHEN** el administrador registra un dominio propio del cliente (por ejemplo `radio-x.com`)
- **THEN** el dominio queda asociado con tipo `custom` y un token de verificación, y permanece `pending` hasta verificar el CNAME

#### Scenario: Un solo dominio primario
- **WHEN** se marca un dominio como primario de un cliente que ya tenía otro primario
- **THEN** el dominio anterior deja de ser primario y solo uno queda como primario

### Requirement: Resolución de host a cliente
El sistema SHALL exponer un endpoint público que, dado un host, devuelva el `clientId` del cliente activo correspondiente. La comparación SHALL normalizar el host (minúsculas, sin puerto ni punto final) y SHALL devolver un resultado de "no encontrado" cuando el host no esté registrado o su dominio no esté `active`.

#### Scenario: Host registrado y activo
- **WHEN** se consulta el host de un dominio `active` asociado a un cliente
- **THEN** el sistema responde con el `clientId` de ese cliente

#### Scenario: Host no registrado
- **WHEN** se consulta un host que no corresponde a ningún dominio registrado
- **THEN** el sistema responde indicando que no hay cliente para ese host, sin error de servidor

#### Scenario: Host con mayúsculas o puerto
- **WHEN** se consulta el mismo host con mayúsculas, con `www.`, o con un puerto explícito
- **THEN** el sistema lo resuelve al mismo cliente que el host canónico

### Requirement: Identificación por host del dominio primario en la plataforma
El sistema SHALL resolver el cliente a partir del subdominio de la plataforma usando la etiqueta anterior al dominio base (por ejemplo `radio-x` en `radio-x.panelipstream.cl`) cuando ese subdominio esté registrado.

#### Scenario: Subdominio de plataforma
- **WHEN** llega una petición a `radio-x.panelipstream.cl` y existe un dominio registrado con esa etiqueta
- **THEN** el sistema resuelve al cliente correspondiente
