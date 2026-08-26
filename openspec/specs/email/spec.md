## Purpose

Comunicación por correo con los clientes vía Resend: boletas de cobro automáticas, avisos de soporte y comunicaciones generales desde el panel, con plantillas editables, adjuntos (PDF) e historial con rastreo de entrega/lectura.

## Requirements

### Requirement: El administrador envía correos a clientes desde el panel
El sistema SHALL permitir al administrador redactar y enviar correos a uno, varios o todos los clientes, usando una plantilla existente o un texto libre, con asunto, cuerpo y adjunto opcional. Cada destinatario SHALL recibir el correo desde la dirección de envío configurada.

#### Scenario: Enviar a un cliente
- **WHEN** el administrador elige un cliente, redacta asunto y cuerpo, y confirma el envío
- **THEN** el cliente recibe el correo y el envío queda registrado en el historial

#### Scenario: Enviar a todos los clientes
- **WHEN** el administrador confirma el envío masivo a todos los clientes
- **THEN** el sistema envía a cada cliente con correo registrado, de forma secuencial con throttling, y registra un envío por destinatario
- **AND** muestra una confirmación previa con la cantidad de destinatarios antes de enviar

#### Scenario: Adjuntar una boleta
- **WHEN** el administrador adjunta la boleta (PDF de cuenta) de un pago a un correo
- **THEN** el cliente recibe el correo con el PDF adjunto

#### Scenario: Cliente sin correo registrado
- **WHEN** un cliente no tiene correo electrónico
- **THEN** no se le envía correo y el envío se omite sin romper el resto

### Requirement: Las plantillas de correo son editables desde el admin
El sistema SHALL exponer plantillas de correo editables (asunto + cuerpo HTML) con variables reemplazables (`{{nombre}}`, `{{plan}}`, `{{monto}}`, `{{fecha}}`, `{{link}}`, `{{descripcion}}`), activables/desactivables individualmente, y SHALL permitir enviar un correo de prueba a la dirección del administrador.

#### Scenario: Editar una plantilla
- **WHEN** el administrador modifica el asunto y el cuerpo HTML de una plantilla y la guarda
- **THEN** los próximos envíos que usen esa plantilla usan el contenido actualizado

#### Scenario: Plantilla desactivada
- **WHEN** una plantilla está desactivada y se dispara un envío automático que la usa
- **THEN** el envío automático se omite y se registra en el historial como omitido

#### Scenario: Correo de prueba
- **WHEN** el administrador solicita un correo de prueba de una plantilla
- **THEN** se envía a su propia dirección con el contenido renderizado

### Requirement: El envío de boletas es automático
El sistema SHALL enviar correos automáticamente ligados al ciclo de pagos: al generarse una cuota pendiente se envía un aviso de cobro, y al confirmarse un pago se envía la boleta/recibo con el PDF adjunto. Los envíos SHALL ocurrir después de que la operación de pago haya sido persistida y NO deben impedir que el pago se registre si el correo falla.

#### Scenario: Se genera una cuota pendiente
- **WHEN** el sistema crea una cuota pendiente para el ciclo de un cliente
- **THEN** se envía automáticamente un aviso de cobro con los datos de la cuota

#### Scenario: Se confirma un pago
- **WHEN** un pago pasa a estado completado
- **THEN** se envía automáticamente la boleta con el PDF de la cuenta adjunto

#### Scenario: El correo falla pero el pago se registra
- **WHEN** el envío del correo falla al confirmar un pago
- **THEN** el pago queda registrado correctamente y el envío queda marcado como fallido en el historial

#### Scenario: Plantilla de boleta desactivada
- **WHEN** la plantilla de boleta está desactivada y se confirma un pago
- **THEN** el pago se registra sin envío y el envío queda registrado como omitido

### Requirement: El aviso de soporte se envía al responder un ticket
El sistema SHALL notificar por correo al cliente cuando el administrador responde un ticket de soporte, con la respuesta y un enlace al ticket.

#### Scenario: El admin responde un ticket
- **WHEN** el administrador agrega una respuesta a un ticket
- **THEN** se envía un correo al cliente con la respuesta y un enlace al ticket

#### Scenario: Respuesta sin envío
- **WHEN** la plantilla de soporte está desactivada o el cliente no tiene correo
- **THEN** la respuesta al ticket se guarda sin envío de correo

### Requirement: Cada envío queda registrado con rastreo
El sistema SHALL registrar cada correo en un historial (destinatario, asunto, plantilla, estado) y SHALL actualizar el estado de entrega/lectura mediante webhooks del proveedor (entregado, rebotado, abierto, clic, fallido), mostrándose en el panel de administración con filtros por cliente y estado.

#### Scenario: Envío registrado
- **WHEN** el sistema envía un correo
- **THEN** se crea un registro en el historial con estado inicial "enviado"

#### Scenario: El cliente abre el correo
- **WHEN** el proveedor notifica que el correo fue entregado, abierto o clickeado
- **THEN** el historial se actualiza con el estado correspondiente y su marca de tiempo

#### Scenario: Webhook no autorizado
- **WHEN** una petición al webhook llega sin firma válida
- **THEN** se rechaza sin modificar el historial

#### Scenario: Historial filtrable
- **WHEN** el administrador consulta el historial
- **THEN** puede filtrar por cliente, plantilla, estado y rango de fechas

### Requirement: El sistema respeta los límites y aísla fallos del proveedor
El sistema SHALL manejar errores del proveedor de correo sin romper las operaciones de negocio asociadas (pagos, tickets), y SHALL limitar la tasa de envío para envíos masivos.

#### Scenario: Límite de tasa en envío masivo
- **WHEN** un envío a todos los clientes supera la tasa permitida del proveedor
- **THEN** el sistema encola o espacia los envíos para no exceder el límite
