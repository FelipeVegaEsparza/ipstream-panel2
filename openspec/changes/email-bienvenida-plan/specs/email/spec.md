## ADDED Requirements

### Requirement: El cliente recibe un correo de bienvenida al contratar un plan
El sistema SHALL enviar automáticamente un correo de bienvenida al cliente cuando contrata un plan, tanto al suscribirse/registrarse por su cuenta como cuando el administrador le asigna un plan. El correo SHALL usar la plantilla editable `bienvenida` y SHALL enviarse además de la boleta/cobro existente, sin reemplazarla.

#### Scenario: Cliente se registra y contrata un plan
- **WHEN** un cliente se registra por su cuenta y contrata un plan
- **THEN** se envía automáticamente el correo de bienvenida con los datos del plan y un enlace a su panel

#### Scenario: El administrador asigna un plan
- **WHEN** el administrador asigna un plan a un cliente
- **THEN** el cliente recibe automáticamente el correo de bienvenida con los datos del plan

#### Scenario: La contratación del plan se registra aunque el correo falle
- **WHEN** el envío del correo de bienvenida falla al contratar un plan
- **THEN** el plan queda contratado correctamente y el envío queda marcado como fallido en el historial

#### Scenario: Plantilla de bienvenida desactivada
- **WHEN** la plantilla de bienvenida está desactivada y un cliente contrata un plan
- **THEN** el plan se contrata sin envío de bienvenida y el envío queda registrado como omitido en el historial

### Requirement: La plantilla de bienvenida es editable desde el admin
El sistema SHALL exponer la plantilla de bienvenida (`bienvenida`) como editable desde el panel de administración, dentro de la sección de Plantillas en Comunicaciones, con asunto y cuerpo HTML, variables reemplazables (`{{nombre}}`, `{{proyecto}}`, `{{plan}}`, `{{monto}}`, `{{moneda}}`, `{{fecha}}`, `{{link}}`), activación/desactivación y envío de prueba a la dirección del administrador.

#### Scenario: Editar la plantilla de bienvenida
- **WHEN** el administrador modifica el asunto o el cuerpo HTML de la plantilla de bienvenida y la guarda
- **THEN** los próximos envíos de bienvenida usan el contenido actualizado

#### Scenario: Correo de prueba de la plantilla de bienvenida
- **WHEN** el administrador solicita un correo de prueba de la plantilla de bienvenida
- **THEN** se envía a su propia dirección con el contenido renderizado
