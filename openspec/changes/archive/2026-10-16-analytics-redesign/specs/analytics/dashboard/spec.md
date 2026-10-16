# Spec Delta

## Purpose

Exponer la analítica de radio y televisión al cliente en una sección con tabs, con KPIs, series temporales, rankings y exportación, respetando su zona horaria.

## ADDED Requirements

### Requirement: Sección de estadísticas con tabs
El sistema SHALL ofrecer una sección `/dashboard/estadisticas` con tabs para Radio y Televisión. La tab de Televisión SHALL mostrarse solo si el plan del cliente incluye TV. La sección reemplaza a la vista anterior `/dashboard/streaming/stats`.

#### Scenario: Cliente con radio y TV
- **WHEN** el cliente abre Estadísticas
- **THEN** ve las tabs Radio y Televisión

#### Scenario: Cliente solo radio
- **WHEN** el plan del cliente no incluye TV
- **THEN** solo ve la tab Radio

#### Scenario: Reemplazo de la vista anterior
- **WHEN** el cliente navega a la antigua ruta de estadísticas de streaming
- **THEN** es redirigido a la nueva sección de estadísticas

### Requirement: Selección de período y granularidad
El sistema SHALL permitir elegir el período (por ejemplo, últimas 24 horas, 7 días, 30 días o un rango) y SHALL presentar las series con granularidad por hora para períodos cortos y por día para períodos largos.

#### Scenario: Período corto
- **WHEN** el cliente elige las últimas 24 horas
- **THEN** la serie se muestra con granularidad horaria

#### Scenario: Período largo
- **WHEN** el cliente elige 30 días
- **THEN** la serie se muestra con granularidad diaria

### Requirement: Indicadores de audiencia
El sistema SHALL mostrar, por servicio y período, indicadores de audiencia actual, promedio, pico, audiencia única, tiempo de escucha/visualización y uptime, junto con su variación respecto del período anterior equivalente.

#### Scenario: Indicadores con comparación
- **WHEN** el cliente abre la tab Radio
- **THEN** ve los indicadores del período y la variación respecto del período anterior

#### Scenario: Sin período anterior comparable
- **WHEN** no existen datos del período anterior
- **THEN** la variación se muestra como no disponible sin romper la vista

### Requirement: Rankings y heatmap
El sistema SHALL mostrar los elementos más reproducidos (canciones y artistas en radio, videos en televisión), las sesiones de DJ en vivo por duración, y un heatmap de audiencia por día de la semana y hora, en la zona horaria del cliente.

#### Scenario: Top de contenido
- **WHEN** el cliente consulta la tab Radio
- **THEN** ve las canciones, artistas y DJs más destacados del período

#### Scenario: Heatmap en zona del cliente
- **WHEN** se muestra el heatmap
- **THEN** las horas corresponden a la zona horaria del cliente

### Requirement: Exportación de datos
El sistema SHALL permitir exportar la analítica del período seleccionado en formato CSV.

#### Scenario: Exportar período
- **WHEN** el cliente pulsa exportar
- **THEN** descarga un archivo CSV con los datos del período y servicio seleccionados

### Requirement: Estado sin datos
El sistema SHALL mostrar un estado vacío explicativo cuando no haya datos en el período, sin romper la vista.

#### Scenario: Período sin datos
- **WHEN** el período seleccionado no tiene muestras
- **THEN** la vista indica que aún no hay datos recolectados para ese período

### Requirement: Acceso restringido al cliente
La analítica SHALL exponerse mediante endpoints autenticados del panel que resuelven el cliente de la sesión, sin permitir consultar datos de otros clientes.

#### Scenario: Consulta autenticada
- **WHEN** un cliente consulta su analítica
- **THEN** solo recibe datos de su propio cliente

#### Scenario: Acceso no autenticado
- **WHEN** un usuario sin sesión intenta consultar la analítica
- **THEN** el acceso es denegado
