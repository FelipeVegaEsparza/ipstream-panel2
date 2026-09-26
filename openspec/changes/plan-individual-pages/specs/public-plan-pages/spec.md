# Spec Delta

## Purpose

Expone una página pública individual por plan, con URL amigable basada en el nombre del plan, donde el visitante ve las características del plan y puede contratarlo con el plan ya preseleccionado.

## ADDED Requirements

### Requirement: Página pública individual por plan
El sistema SHALL exponer una página pública en la ruta `/planes/[slug]` para cada plan activo, donde el visitante puede ver las características del plan y contratarlo. La ruta SHALL ser un Server Component que consulte los planes activos en cada petición.

#### Scenario: Visitar la página de un plan activo
- **WHEN** el visitante accede a `/planes/<slug>` correspondiente a un plan activo
- **THEN** el sistema responde `200` con la página del plan que muestra su nombre, descripción, precio, moneda, intervalo, servicios incluidos, cuotas de almacenamiento y la lista completa de características

#### Scenario: Plan inexistente o inactivo
- **WHEN** el visitante accede a `/planes/<slug>` donde `<slug>` no corresponde a ningún plan activo (inexistente, mal escrito o desactivado)
- **THEN** el sistema responde `404`

### Requirement: Slug derivado del nombre del plan
El sistema SHALL identificar cada plan por un slug derivado de su nombre (en minúsculas, sin acentos y con espacios y símbolos reemplazados por guiones), resuelto contra los planes activos, sin requerir un campo persistido ni una migración de base de datos.

#### Scenario: Resolución del slug por nombre
- **WHEN** el visitante accede a `/planes/<slug>` y existe un plan activo cuyo nombre normalizado coincide con `<slug>`
- **THEN** el sistema muestra la página de ese plan

#### Scenario: Nombres con mayúsculas o acentos
- **WHEN** el visitante accede al slug normalizado de un plan cuyo nombre contiene mayúsculas o acentos
- **THEN** el sistema resuelve el plan correctamente y muestra su página

### Requirement: Formulario de contratación con el plan preseleccionado
La página del plan SHALL mostrar el formulario de contratación con ese plan ya preseleccionado y fijo, de modo que el visitante complete sus datos (nombre, email y contraseña) sin poder cambiar de plan desde esa página. El envío SHALL usar el flujo de registro existente `POST /api/auth/register` con el identificador del plan de la página.

#### Scenario: Registro desde la página del plan
- **WHEN** el visitante completa el formulario con datos válidos en `/planes/<slug>` y lo envía
- **THEN** el sistema crea la cuenta y la suscripción con el plan de la página, usando el flujo de registro existente

#### Scenario: Éxito del registro
- **WHEN** el registro se completa correctamente desde la página del plan
- **THEN** la página muestra la confirmación de cuenta creada junto con el plan contratado, igual que el flujo actual

#### Scenario: Error de validación del registro
- **WHEN** el envío del formulario falla por datos inválidos o email ya registrado
- **THEN** la página muestra el mensaje de error correspondiente y permite reintentar, sin perder el plan preseleccionado

### Requirement: Metadatos de la página por plan
El sistema SHALL generar metadatos (título y descripción) específicos del plan para la página `/planes/[slug]`.

#### Scenario: Título de la página del plan
- **WHEN** el visitante o un buscador accede a `/planes/<slug>`
- **THEN** el documento incluye un título y una descripción derivados del nombre y los datos del plan
