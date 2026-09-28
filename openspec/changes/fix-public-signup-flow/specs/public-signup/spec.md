## Purpose

Registro de clientes desde las páginas públicas de IPStream (`/registro` y `/planes/[slug]`): creación de la cuenta, su cliente, la suscripción y la cuota inicial de forma atómica, validación del plan elegido, seed del contenido por defecto del AutoDJ tolerante a fallos y limitación de tasa de registros.

## ADDED Requirements

### Requirement: El registro público crea la cuenta y su plan de forma atómica

El sistema SHALL crear, a partir del formulario público de registro, la cuenta de usuario, su cliente, la suscripción del plan elegido y su cuota inicial dentro de una única operación atómica. Si cualquier paso falla, el sistema NO SHALL dejar registros parciales (usuario sin cliente, cliente sin suscripción o suscripción sin pago) y SHALL responder un error claro al solicitante. El registro sin plan SHALL crear la cuenta y el cliente sin suscripción ni pago.

#### Scenario: Registro exitoso con plan

- **WHEN** un visitante envía datos válidos eligiendo un plan activo
- **THEN** el sistema crea la cuenta, el cliente, la suscripción del plan y su cuota inicial de forma consistente
- **AND** responde indicando que el registro fue exitoso

#### Scenario: Fallo durante la creación

- **WHEN** falla la creación de la suscripción o del pago después de haberse creado la cuenta
- **THEN** el sistema no deja usuario, cliente ni suscripción parciales
- **AND** responde un error claro al solicitante

#### Scenario: Registro sin plan

- **WHEN** el visitante envía datos válidos sin elegir plan
- **THEN** el sistema crea la cuenta y el cliente sin suscripción ni pago
- **AND** responde indicando que el registro fue exitoso

### Requirement: El plan elegido se valida en el servidor

El sistema SHALL validar que el plan recibido existe y está activo antes de asignarlo. Un plan inexistente o inactivo SHALL rechazarse con un error de validación y el registro NO SHALL continuar como si el plan se hubiera asignado.

#### Scenario: Plan inválido

- **WHEN** el formulario envía un identificador de plan inexistente o inactivo
- **THEN** el sistema responde un error de validación
- **AND** no crea cuenta, cliente, suscripción ni pago

#### Scenario: Plan válido

- **WHEN** el formulario envía un plan existente y activo
- **THEN** el sistema asigna ese plan a la suscripción creada para el cliente

### Requirement: El seed del AutoDJ es tolerante a fallos y observable

El sistema SHALL intentar sembrar el contenido por defecto del AutoDJ (tema y playlist) cuando el cliente nuevo incluye RadioStream. Si el agente de streaming no responde, el nodo no está actualizado o el seed falla, el registro SHALL completarse igualmente, el fallo SHALL registrarse y el administrador SHALL ser informado para su reintento.

#### Scenario: Seed exitoso

- **WHEN** se crea un cliente con RadioStream y el agente de streaming responde
- **THEN** el sistema crea el tema por defecto y una playlist activa con ese tema

#### Scenario: Nodo caído o no actualizado

- **WHEN** el seed del contenido por defecto falla porque el agente no responde o el nodo está desactualizado
- **THEN** el registro del cliente se completa de todos modos
- **AND** el fallo queda registrado y se informa al administrador

#### Scenario: Cliente sin RadioStream

- **WHEN** el plan elegido no incluye radio
- **THEN** el sistema no intenta sembrar contenido de AutoDJ

### Requirement: El límite de registros por origen es fiable

El sistema SHALL limitar la cantidad de registros por origen dentro de una ventana de tiempo. El límite SHALL aplicarse sobre la identidad real del solicitante derivada del proxy de forma que no se evada añadiendo valores a las cabeceras de reenvío, y su alcance SHALL ser consistente con el despliegue (única instancia o estado compartido).

#### Scenario: Dentro del límite

- **WHEN** un mismo origen realiza menos registros que el máximo permitido dentro de la ventana
- **THEN** el sistema permite el registro

#### Scenario: Límite excedido

- **WHEN** un mismo origen supera el máximo de registros permitidos dentro de la ventana
- **THEN** el sistema rechaza el registro con un error de límite de tasa

#### Scenario: Cabeceras de proxy falsificadas

- **WHEN** un solicitante envía valores arbitrarios en las cabeceras de reenvío para aparentar otro origen
- **THEN** el sistema no le concede cupo adicional de registros
