# Spec Delta

## Purpose

Permitir que un único build de la PWA determine en runtime qué cliente representa a partir del host desde el que se sirve, sin hornear el `clientId` en el build.

## ADDED Requirements

### Requirement: Resolución del tenant en runtime por host
La PWA SHALL determinar su tenant activo a partir del host desde el que se carga, consultando la resolución de dominio del panel. El `clientId` inyectado en el build SHALL usarse únicamente como respaldo cuando la resolución por host no esté disponible (por ejemplo, en desarrollo).

#### Scenario: Host resuelve a un cliente
- **WHEN** la PWA se carga desde el host de un cliente activo
- **THEN** la aplicación usa el `clientId` resuelto por host como tenant activo

#### Scenario: Resolución no disponible con build de cliente
- **WHEN** la resolución por host falla o no está configurada, pero el build trae un `clientId`
- **THEN** la aplicación usa el `clientId` del build como respaldo

#### Scenario: Sin tenant identificable
- **WHEN** ni la resolución por host ni el build proveen un `clientId`
- **THEN** la aplicación muestra la pantalla de cliente desconocido sin romper el resto de la app

### Requirement: Identidad del tenant expuesta a la aplicación
La PWA SHALL exponer a toda la aplicación la identidad del tenant activo: `clientId`, nombre (si se conoce) y la URL base de la API pública derivada de la configuración del entorno.

#### Scenario: Módulos consultan el tenant
- **WHEN** cualquier módulo solicita el tenant activo
- **THEN** recibe `clientId`, nombre y base URL de la API sin duplicar la lógica de resolución

### Requirement: Selección de template en runtime con respaldo
La PWA SHALL seleccionar el template del cliente en runtime a partir del dato provisto por la API (`selectedTemplate`), cargando cada template de forma diferida. Ante un identificador de template desconocido o un error de carga, SHALL usar el template por defecto.

#### Scenario: Template conocido
- **WHEN** el cliente tiene un template configurado y soportado
- **THEN** la aplicación renderiza ese template, cargándolo de forma diferida

#### Scenario: Template desconocido o con error
- **WHEN** el template configurado no existe o falla al cargar
- **THEN** la aplicación usa el template por defecto en lugar de fallar

### Requirement: Base de la API configurable por entorno
La PWA SHALL derivar la base de la API pública de una configuración de entorno (no hardcodeada), y SHALL permitir que el sitio del cliente y la API residan en el mismo origen o en orígenes distintos.

#### Scenario: API en el mismo origen
- **WHEN** la configuración apunta la API al mismo origen que sirve la app
- **THEN** las llamadas se hacen contra ese origen sin CORS

#### Scenario: API en otro origen
- **WHEN** la configuración apunta la API a un origen distinto
- **THEN** las llamadas se hacen contra ese origen con CORS habilitado
