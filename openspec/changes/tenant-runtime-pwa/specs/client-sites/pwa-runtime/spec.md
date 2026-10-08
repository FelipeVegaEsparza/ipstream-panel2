# Spec Delta

## Purpose

Permitir que un único build de la PWA determine en runtime qué cliente representa a partir del host desde el que se sirve, sin hornear el `clientId` en el build.

## ADDED Requirements

### Requirement: Resolución del tenant en runtime
La PWA SHALL resolver su tenant activo así: si el build trae un `clientId` inyectado (desarrollo o build por cliente), SHALL usarlo directamente sin consultar el host; si no lo trae (bundle único de cliente), SHALL determinarlo a partir del host consultando la resolución de dominio del panel.

#### Scenario: Build con clientId (desarrollo o build por cliente)
- **WHEN** la PWA se carga y el build trae un `clientId` inyectado
- **THEN** la aplicación lo usa como tenant activo sin consultar la resolución por host

#### Scenario: Bundle único resuelto por host
- **WHEN** el build no trae `clientId` y el host corresponde a un cliente activo
- **THEN** la aplicación usa el `clientId` resuelto por host como tenant activo

#### Scenario: Sin tenant identificable
- **WHEN** el build no trae `clientId` y el host no resuelve a ningún cliente
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
