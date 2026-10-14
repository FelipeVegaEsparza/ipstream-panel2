# Install Metrics Specification

## Purpose

Permite saber cuántos dispositivos tienen instalada la app PWA de cada cliente, contando únicamente instalaciones reales (no visitas), y mostrarlo en el home del dashboard.

## Requirements

### Requirement: Detección de instalación real
La PWA SHALL reportar al panel que un dispositivo está instalado cuando se cumpla alguna de estas condiciones: la app corre en modo standalone (`display-mode: standalone`, `fullscreen`, `minimal-ui` o `navigator.standalone` en iOS) o se dispara el evento `appinstalled`.

#### Scenario: Apertura como app instalada
- **WHEN** el oyente abre la PWA instalada (modo standalone)
- **THEN** la PWA reporta la instalación del dispositivo al panel

#### Scenario: Instalación desde el navegador
- **WHEN** se dispara el evento `appinstalled` en la sesión
- **THEN** la PWA reporta la instalación de ese dispositivo

#### Scenario: Uso solo desde el navegador
- **WHEN** el oyente usa la PWA en una pestaña del navegador sin instalarla
- **THEN** el dispositivo NO se cuenta como instalado

### Requirement: Registro idempotente de la instalación
El panel SHALL marcar un dispositivo como instalado una sola vez; reportes repetidos del mismo dispositivo NO SHALL incrementar el conteo.

#### Scenario: Reportes repetidos
- **WHEN** el mismo dispositivo reporta la instalación más de una vez
- **THEN** el sistema conserva una única marca de instalación y el conteo no cambia

### Requirement: Conteo de instalaciones por cliente
El sistema SHALL exponer al cliente autenticado la cantidad de dispositivos con la app instalada, contando solo los registros con instalación confirmada y solo del cliente correspondiente.

#### Scenario: Cliente con instalaciones
- **WHEN** el cliente consulta su estadística de instalaciones
- **THEN** el sistema devuelve la cantidad de dispositivos marcados como instalados de ese cliente

#### Scenario: Conteo desde cero
- **WHEN** se despliega la funcionalidad y existen registros previos de visitas sin confirmación de instalación
- **THEN** esos registros NO cuentan y el conteo inicia en 0, creciendo solo con instalaciones reales

#### Scenario: Aislamiento entre clientes
- **WHEN** un cliente consulta su conteo
- **THEN** el número incluye únicamente dispositivos de su propio cliente

### Requirement: Visualización en el dashboard
El dashboard SHALL mostrar la cantidad de dispositivos con la PWA instalada en la pantalla principal del cliente.

#### Scenario: Tarjeta en el home
- **WHEN** el cliente abre el home del dashboard
- **THEN** ve una tarjeta con la cantidad de dispositivos con la PWA instalada

#### Scenario: Cliente sin instalaciones
- **WHEN** el cliente todavía no tiene ninguna instalación confirmada
- **THEN** la tarjeta muestra 0 (o un estado "sin instalaciones"), sin error
