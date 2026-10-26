# Spec Delta

## Purpose

Permite vender y otorgar paquetes adicionales de créditos de IA que no vencen, para que los clientes sigan usando las funciones de IA cuando agotan la cuota mensual de su plan.

## ADDED Requirements

### Requirement: Catálogo de paquetes de créditos IA

El panel de administración SHALL permitir crear, editar y activar/desactivar paquetes adicionales de créditos IA. Cada paquete SHALL definir un nombre, un tipo de crédito (`caracteres` o `música`), una cantidad positiva, un precio, una moneda y su estado de disponibilidad. Solo los usuarios administradores SHALL poder gestionar el catálogo.

#### Scenario: Crear un paquete de caracteres

- **WHEN** el administrador crea un paquete de tipo caracteres con cantidad y precio válidos
- **THEN** el paquete queda disponible para ser solicitado o vendido a los clientes

#### Scenario: Crear un paquete de música

- **WHEN** el administrador crea un paquete de tipo música con cantidad de minutos y precio válidos
- **THEN** el paquete queda disponible para ser solicitado o vendido a los clientes

#### Scenario: Paquete inválido

- **WHEN** el administrador intenta guardar un paquete sin nombre, con cantidad cero o negativa, o sin precio
- **THEN** el sistema rechaza la operación con un error de validación

#### Scenario: Desactivar un paquete

- **WHEN** el administrador desactiva un paquete
- **THEN** el paquete deja de mostrarse a los clientes para nuevas solicitudes, sin alterar ventas ni saldos ya otorgados

#### Scenario: Acceso no autorizado al catálogo

- **WHEN** un usuario que no es administrador intenta crear, editar o desactivar un paquete
- **THEN** el sistema le deniega el acceso

### Requirement: Saldo adicional sin vencimiento

Los créditos de los paquetes SHALL ser un saldo adicional por cliente y por tipo de crédito, independiente de la cuota mensual del plan. Los créditos adicionales NO SHALL vencer por el paso del tiempo ni por el cambio de período mensual. El consumo SHALL usar primero la cuota mensual del plan y, cuando esta se agote, el saldo adicional.

#### Scenario: Uso después de agotar la cuota del plan

- **WHEN** un cliente tiene 50 caracteres de plan y 100 caracteres adicionales, y consume 80 caracteres
- **THEN** se consumen 50 del plan y 30 del saldo adicional, y quedan 70 caracteres adicionales

#### Scenario: Cambio de mes

- **WHEN** termina el período mensual y el cliente no consumió todo su saldo adicional
- **THEN** el saldo adicional se conserva para el período siguiente

#### Scenario: Saldo por tipo de crédito

- **WHEN** el cliente recibe un paquete de caracteres y un paquete de música
- **THEN** cada saldo se consume solo con su tipo de crédito correspondiente y no se mezclan

#### Scenario: Consumo sin cuota disponible

- **WHEN** el cliente no tiene cuota de plan ni saldo adicional suficiente
- **THEN** la generación se rechaza y no se altera ningún saldo

#### Scenario: Audio cacheado

- **WHEN** una locución o jingle reutiliza audio cacheado y no descuenta cuota
- **THEN** tampoco descuenta saldo adicional

### Requirement: Cuota efectiva en todas las funciones de IA

La cuota efectiva disponible para las funciones de IA SHALL incluir la cuota restante del plan más el saldo adicional del cliente. Las validaciones y los bloqueos por límite de locución libre, clima/hora, presentador del AutoDJ, cápsulas IA y jingles IA SHALL usar esa cuota efectiva.

#### Scenario: Locución con saldo adicional

- **WHEN** el plan agotó sus caracteres pero el cliente tiene saldo adicional de caracteres
- **THEN** puede generar locuciones y el consumo descuenta el saldo adicional

#### Scenario: Música con saldo adicional

- **WHEN** el plan agotó sus minutos de música pero el cliente tiene saldo adicional de música
- **THEN** puede generar jingles o cápsulas con música y el consumo descuenta el saldo adicional

#### Scenario: Saldo insuficiente

- **WHEN** el costo de la operación supera la cuota efectiva disponible
- **THEN** la operación se rechaza por límite y el saldo permanece sin cambios

### Requirement: Solicitud de compra del cliente

El cliente SHALL poder ver los paquetes activos en la sección Consumo IA y solicitar la compra de uno. Una solicitud SHALL quedar en estado pendiente y NO SHALL otorgar créditos hasta que un administrador la apruebe. El cliente SHALL ver el estado de sus propias solicitudes y NO SHALL ver solicitudes de otros clientes.

#### Scenario: Solicitar un paquete

- **WHEN** el cliente selecciona un paquete activo y envía la solicitud
- **THEN** el sistema registra una solicitud pendiente y la muestra en su historial

#### Scenario: Paquete inactivo

- **WHEN** el cliente intenta solicitar un paquete inactivo o inexistente
- **THEN** el sistema rechaza la solicitud y no otorga créditos

#### Scenario: Solicitud duplicada

- **WHEN** el cliente ya tiene una solicitud pendiente para el mismo paquete
- **THEN** el sistema evita crear una segunda solicitud pendiente para ese paquete

#### Scenario: Aislamiento entre clientes

- **WHEN** un cliente consulta sus solicitudes
- **THEN** solo ve las solicitudes de su propio cliente

### Requirement: Venta y otorgamiento por el administrador

Solo un administrador SHALL poder aprobar solicitudes o vender un paquete directamente. Al aprobar una solicitud o realizar una venta directa, el sistema SHALL registrar un pago completado asociado al cliente y crear el saldo adicional correspondiente en una misma operación. Al rechazar una solicitud, el sistema NO SHALL crear pago ni saldo adicional.

#### Scenario: Aprobar una solicitud

- **WHEN** el administrador aprueba una solicitud pendiente e indica el medio de pago
- **THEN** el sistema marca la solicitud como aprobada, registra un pago completado y suma los créditos al cliente

#### Scenario: Rechazar una solicitud

- **WHEN** el administrador rechaza una solicitud pendiente
- **THEN** la solicitud queda rechazada y el cliente no recibe créditos ni se crea un pago

#### Scenario: Venta directa sin solicitud

- **WHEN** el administrador vende un paquete directamente a un cliente
- **THEN** el sistema registra el pago completado y suma los créditos del paquete al cliente

#### Scenario: Pago en el historial

- **WHEN** se concreta una venta de paquete
- **THEN** el pago aparece en el historial de pagos del cliente con la descripción del paquete

#### Scenario: Acceso no autorizado a la venta

- **WHEN** un usuario que no es administrador intenta aprobar una solicitud o vender un paquete
- **THEN** el sistema le deniega el acceso

### Requirement: Aviso de compra al agotar la cuota

Cuando la cuota efectiva del cliente llegue a cero y existan paquetes activos, la sección Consumo IA SHALL mostrar un aviso destacado de que puede adquirir más créditos y el catálogo de paquetes disponibles. La tarjeta de créditos del dashboard SHALL mostrar un acceso a la compra cuando la cuota efectiva sea cero. Si no hay paquetes activos, NO SHALL mostrarse un aviso de compra.

#### Scenario: Cuota agotada con paquetes disponibles

- **WHEN** el cliente agota su cuota efectiva y hay paquetes activos
- **THEN** ve un aviso para adquirir más créditos y puede abrir la solicitud desde Consumo IA

#### Scenario: Tarjeta del dashboard sin saldo

- **WHEN** la cuota efectiva del cliente es cero
- **THEN** la tarjeta de créditos del dashboard muestra un enlace para comprar más

#### Scenario: Sin paquetes activos

- **WHEN** la cuota efectiva es cero pero no existen paquetes activos
- **THEN** la sección no muestra un aviso de compra

### Requirement: Registro auditable de otorgamientos y consumo

El sistema SHALL conservar por cada otorgamiento el cliente, el paquete de origen, la cantidad otorgada, la cantidad disponible y el origen de la venta. El consumo de créditos adicionales SHALL reducir el saldo de los otorgamientos más antiguos primero y NO SHALL dejar saldos negativos.

#### Scenario: Consumo del saldo más antiguo

- **WHEN** el cliente tiene dos otorgamientos de caracteres y consume parte del saldo
- **THEN** se descuenta primero el otorgamiento más antiguo

#### Scenario: Saldo nunca negativo

- **WHEN** se consume el último crédito disponible de un otorgamiento
- **THEN** su saldo disponible queda en cero y no se descuenta más de ese otorgamiento

#### Scenario: Historial de otorgamientos

- **WHEN** el administrador consulta la sección de paquetes
- **THEN** ve los otorgamientos recientes con cliente, paquete, cantidad y fecha
