# Spec Delta

## Purpose

Permite que el panel aproveche varios núcleos de CPU ejecutando múltiples procesos worker, manteniendo el límite de peticiones global y las tareas de fondo con un único dueño.

## ADDED Requirements

### Requirement: Ejecución multi-proceso con puerto compartido
El sistema SHALL atender peticiones HTTP mediante múltiples procesos worker que comparten el mismo puerto, con una cantidad configurable por `WEB_CONCURRENCY` y un valor por defecto sensato basado en las CPUs disponibles.

#### Scenario: Se levantan varios workers
- **WHEN** arranca el panel con `WEB_CONCURRENCY=3`
- **THEN** se inicia un proceso primario que lanza 3 workers y el servicio responde en el puerto configurado

#### Scenario: Default sin configuración
- **WHEN** arranca el panel sin `WEB_CONCURRENCY`
- **THEN** el sistema elige una cantidad de workers basada en las CPUs disponibles, dejando margen para el resto de servicios

#### Scenario: Un worker que muere se reinicia
- **WHEN** un worker termina de forma inesperada
- **THEN** el primario lanza un reemplazo y el servicio sigue atendiendo

#### Scenario: Apagado ordenado
- **WHEN** el contenedor recibe SIGTERM
- **THEN** el primario reenvía la señal a los workers y el proceso termina sin dejar peticiones colgadas

### Requirement: Límite de peticiones compartido entre procesos
El sistema SHALL aplicar el rate-limit de forma global entre todos los workers, usando un almacén compartido, de modo que el límite no se multiplique por la cantidad de procesos.

#### Scenario: Límite global entre workers
- **WHEN** se superan los intentos permitidos para una misma identidad repartidos entre distintos workers
- **THEN** el sistema bloquea las peticiones excedidas sin importar cuál worker las atienda

#### Scenario: Ventana cumplida
- **WHEN** pasó el período de la ventana para una identidad
- **THEN** el contador se reinicia y se vuelven a permitir peticiones

#### Scenario: Almacén no disponible
- **WHEN** el almacén compartido falla o no responde
- **THEN** el sistema no bloquea el flujo del usuario (fail-open) y registra el error

### Requirement: Tareas de fondo con dueño único
El sistema SHALL ejecutar el poller de salud de servidores de streaming en un único proceso, no uno por worker.

#### Scenario: Un solo poller
- **WHEN** el panel corre con varios workers
- **THEN** el chequeo periódico de servidores se ejecuta una sola vez por intervalo, no una vez por worker
