# Spec Delta

## Purpose

Automatizar la puesta en marcha de un dominio de cliente (subdominio propio o dominio custom) al contratar o asignar un cliente, incluyendo DNS, verificación y TLS.

## ADDED Requirements

### Requirement: Provisión automatizada del subdominio propio
El sistema SHALL, al asignarse un subdominio de la plataforma a un cliente, crear o asegurar el registro DNS correspondiente mediante un trabajo en segundo plano que reporta progreso y errores. Si el registro ya existe y apunta al destino correcto, el sistema SHALL considerarlo exitoso sin duplicarlo.

#### Scenario: Alta de subdominio nuevo
- **WHEN** se asigna un subdominio de la plataforma a un cliente
- **THEN** el sistema crea el registro DNS y, al completarse con éxito, marca el dominio como `active`

#### Scenario: Subdominio ya existente y correcto
- **WHEN** el registro DNS del subdominio ya existe y apunta al destino correcto
- **THEN** el sistema marca el dominio como `active` sin crear un registro duplicado

#### Scenario: Falla de DNS
- **WHEN** la creación/aseguramiento del registro DNS falla
- **THEN** el trabajo queda en error con un mensaje legible y el dominio permanece `pending`, pudiendo reintentarse

### Requirement: Verificación de dominio custom
El sistema SHALL verificar que un dominio custom apunta correctamente a la plataforma (mediante CNAME o registro equivalente) antes de marcarlo `active`, y SHALL permitir reintentar la verificación.

#### Scenario: CNAME correcto
- **WHEN** el cliente configura su dominio con el CNAME indicado y se ejecuta/retoma la verificación
- **THEN** el sistema marca el dominio como `active`

#### Scenario: CNAME ausente o incorrecto
- **WHEN** el dominio custom no apunta correctamente a la plataforma
- **THEN** el sistema lo deja `pending` e informa que la verificación no se completó

### Requirement: Emisión de TLS sólo para dominios registrados y activos
El sistema SHALL autorizar la emisión de certificados únicamente para dominios registrados y `active`, exponiendo un endpoint de validación que la capa de TLS consulta antes de emitir un certificado.

#### Scenario: Dominio autorizado
- **WHEN** la capa de TLS consulta por un dominio registrado y `active`
- **THEN** el sistema autoriza la emisión del certificado

#### Scenario: Dominio no autorizado
- **WHEN** la capa de TLS consulta por un dominio no registrado o no `active`
- **THEN** el sistema rechaza la emisión del certificado

### Requirement: Estados y trazabilidad del dominio
El sistema SHALL exponer el estado de cada dominio (`pending`, `active`, `error`) y el progreso del trabajo de provisión, para poder diagnosticar y reintentar desde el panel de administración.

#### Scenario: Consulta de estado
- **WHEN** el administrador consulta el estado de un dominio
- **THEN** el sistema devuelve su estado y, si corresponde, el detalle del último intento de provisión
