# Spec Delta

## Purpose

Permitir que el cliente pague un pago pendiente con PayPal en la moneda de ese pago, actualizando el estado local de forma segura y conciliando por webhook.

## ADDED Requirements

### Requirement: Pagar un pago pendiente con PayPal
El sistema SHALL permitir al cliente iniciar el pago de un pago pendiente mediante PayPal, en la moneda y el monto de ese pago, redirigiendo al checkout de PayPal.

#### Scenario: Iniciar el pago
- **WHEN** el cliente pulsa "Pagar con PayPal" sobre un pago pendiente
- **THEN** el sistema crea una orden de PayPal por el monto/moneda del pago y lo lleva al checkout de PayPal

#### Scenario: Pago aprobado
- **WHEN** el cliente aprueba la orden en PayPal y el sistema la captura correctamente
- **THEN** el pago local pasa a estado `completed`, con método de pago PayPal y el identificador de transacción

#### Scenario: Pago cancelado o fallido
- **WHEN** el cliente cancela el checkout o la captura falla
- **THEN** el pago local permanece `pending` y se informa el resultado, permitiendo reintentar

### Requirement: Conciliación por webhook
El sistema SHALL exponer un webhook de PayPal que procese eventos de aprobación/captura de pago y actualice el pago local de forma **idempotente** (un mismo evento no duplica ni altera un pago ya completado).

#### Scenario: Evento repetido
- **WHEN** llega dos veces el mismo evento de pago completado
- **THEN** el pago se marca completado una sola vez, sin efectos duplicados

### Requirement: Credenciales configurables por entorno
El sistema SHALL tomar las credenciales de PayPal (client id, secret, entorno sandbox/live y webhook id) de configuración de entorno, y SHALL deshabilitar el botón de PayPal cuando no estén configuradas.

#### Scenario: PayPal no configurado
- **WHEN** no hay credenciales de PayPal configuradas
- **THEN** el pago con PayPal no se ofrece (el resto de la facturación sigue funcionando)
