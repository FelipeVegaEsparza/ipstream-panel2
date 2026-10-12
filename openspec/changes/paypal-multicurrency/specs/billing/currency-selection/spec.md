# Spec Delta

## Purpose

Permitir que cada plan tenga precios en varias monedas y que el cliente elija con qué moneda pagar (CLP o USD), propagando esa elección a su suscripción y a sus pagos.

## ADDED Requirements

### Requirement: Precios por moneda por plan
El sistema SHALL permitir definir, para cada plan, un precio por moneda (al menos CLP y USD), configurable desde el panel de administración. Un plan SHALL tener una moneda base y precios opcionales en otras monedas.

#### Scenario: Configurar precio en USD
- **WHEN** el administrador define un precio en USD para un plan que ya tenía precio en CLP
- **THEN** el plan queda disponible para cobrarse en CLP y en USD

#### Scenario: Plan sin precio en una moneda
- **WHEN** un plan no tiene precio definido en una moneda
- **THEN** esa moneda no se ofrece para ese plan

### Requirement: El cliente elige la moneda
La página pública de planes/registro SHALL permitir al cliente seleccionar la moneda (por ejemplo CLP o USD), mostrando el precio del plan en la moneda elegida. Sólo SHALL ofrecer monedas para las que el plan tenga precio.

#### Scenario: Cambiar la moneda en la web pública
- **WHEN** el cliente elige otra moneda en la página de planes
- **THEN** los precios mostrados se actualizan a esa moneda y se usan al registrarse

### Requirement: Moneda elegida en suscripción y pagos
El sistema SHALL registrar la moneda elegida por el cliente en su suscripción y SHALL generar sus pagos con el monto y la moneda correspondientes a esa elección.

#### Scenario: Pago en la moneda elegida
- **WHEN** un cliente que eligió USD contrata un plan
- **THEN** el pago pendiente se genera con el monto en USD del plan y moneda USD

### Requirement: Formato según moneda
El sistema SHALL formatear los montos según la moneda (formato CLP sin decimales, USD con dos decimales) en la web pública, el dashboard, los correos y los PDF.

#### Scenario: Monto en USD
- **WHEN** se muestra un monto en USD en la web o el dashboard
- **THEN** se formatea con dos decimales (por ejemplo `$12.00`) según la moneda

#### Scenario: Monto en CLP
- **WHEN** se muestra un monto en CLP
- **THEN** se formatea sin decimales y con separador de miles (por ejemplo `$12.000`)
