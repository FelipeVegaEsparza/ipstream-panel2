# Spec Delta

## Purpose

Gestiona los nodos de streaming desde el panel de administración, mostrando en cada servidor su estado de provisión y de última actualización.

## ADDED Requirements

### Requirement: La card del servidor muestra la última actualización
El sistema SHALL mostrar en la card de cada servidor de `/admin/servers` la fecha y hora de la última actualización del código/stack del nodo, correspondiente a la última provisión o "Actualizar nodo" completados con éxito.

#### Scenario: Servidor actualizado
- **WHEN** un servidor tiene registrada una actualización completada
- **THEN** su card muestra la fecha y hora de esa actualización

#### Scenario: Servidor sin actualización registrada
- **WHEN** un servidor nunca fue provisionado ni actualizado
- **THEN** la card muestra un estado vacío claro en lugar de una fecha

#### Scenario: La fecha refleja la actualización más reciente
- **WHEN** se completa una nueva actualización del nodo
- **THEN** la card pasa a mostrar la fecha y hora de esa actualización más reciente
