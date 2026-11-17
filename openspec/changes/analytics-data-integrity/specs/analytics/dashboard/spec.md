# Spec Delta

## Purpose

Expone la analítica de radio y televisión al cliente en una sección con tabs, KPIs, series temporales, rankings y exportación, con un contrato estable entre API y UI y con todas las fechas presentadas en la zona horaria del cliente.

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

El sistema SHALL permitir elegir el período (24 horas, 7 días, 30 días o un rango) y SHALL presentar las series con granularidad por hora para períodos cortos y por día para períodos largos. Los períodos de 7 y 30 días SHALL alinearse a días locales del cliente, de modo que “7 días” produzca 7 buckets diarios y “30 días” produzca 30, no 8 y 31.

#### Scenario: Período corto

- **WHEN** el cliente elige las últimas 24 horas
- **THEN** la serie se muestra con granularidad horaria

#### Scenario: Período largo

- **WHEN** el cliente elige 30 días
- **THEN** la serie se muestra con granularidad diaria y 30 buckets

#### Scenario: Ventana alineada al día local

- **WHEN** el cliente elige 7 días
- **THEN** el rango empieza al inicio del día local correspondiente y no a la hora exacta de la consulta

### Requirement: Indicadores de audiencia

El sistema SHALL mostrar, por servicio y período, los indicadores de audiencia promedio, pico, audiencia única, tiempo de escucha o visualización, sesiones y uptime, junto con la variación respecto del período anterior equivalente cuando exista.

#### Scenario: Indicadores con comparación

- **WHEN** el cliente abre la tab Radio y hay datos del período anterior
- **THEN** ve los indicadores del período y la variación respecto del período anterior

#### Scenario: Sin período anterior comparable

- **WHEN** no existen datos del período anterior
- **THEN** la variación se muestra como no disponible sin romper la vista

### Requirement: Contrato estable de la API de resumen

La respuesta de resumen SHALL exponer los mismos nombres de campo que consume la interfaz y SHALL entregar valores numéricos para promedio, pico, tiempo, sesiones, únicos y uptime. Una tarjeta NO SHALL renderizar texto como `undefined` o `NaN`: si un valor no está disponible, la interfaz SHALL mostrar un marcador explícito (por ejemplo, `—`).

#### Scenario: Promedio y pico disponibles

- **WHEN** el período tiene muestras
- **THEN** las tarjetas de Promedio y Pico muestran valores numéricos del período

#### Scenario: Campo ausente o nulo

- **WHEN** la API no entrega un valor
- **THEN** la tarjeta muestra un marcador explícito y no el texto `undefined`

### Requirement: Formateo de fechas en la zona del cliente

Las etiquetas de la serie SHALL representar el día o la hora a la que pertenece cada bucket en la zona horaria del cliente. Un bucket diario NO SHALL mostrarse un día antes por convertir una fecha sin hora como UTC a la zona del navegador. Las horas SHALL formatearse en la zona horaria del cliente y no en la del navegador que consulta.

#### Scenario: Bucket diario en zona distinta de UTC

- **WHEN** un cliente en `America/Santiago` ve el bucket del 17 de noviembre
- **THEN** la etiqueta muestra 17 de noviembre, no 16 de noviembre

#### Scenario: Bucket horario de un cliente en UTC

- **WHEN** un cliente en UTC ve un bucket de las 14:00 UTC desde un navegador en otra zona
- **THEN** la etiqueta muestra 14:00, correspondiente a la zona del cliente

### Requirement: Rankings y heatmap

El sistema SHALL mostrar los elementos más reproducidos (canciones y artistas en radio, videos en televisión), las sesiones de DJ en vivo por duración y un heatmap de audiencia por día de la semana y hora, en la zona horaria del cliente.

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
