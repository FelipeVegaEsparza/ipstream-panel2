# Spec Delta

## Purpose

Define el lenguaje visual Control Room del panel de administración para que el shell y las pantallas de gestión compartan la misma calidad, densidad y semántica que el panel del cliente.

## ADDED Requirements

### Requirement: Shell de administración Control Room

El panel `/admin` SHALL usar el mismo lenguaje visual que el panel del cliente: rail plano de 248px, header compacto de 56px, bordes de 1px, superficies tonales y tipografía de trabajo.

El estado del administrador SHALL mostrarse con una marca compacta y semántica, sin gradientes, glass ni sombras grandes.

#### Scenario: Shell de admin en escritorio

- **WHEN** un administrador abre `/admin`
- **THEN** ve el rail plano, el header compacto y el contenido sobre superficies Control Room

#### Scenario: Shell de admin en móvil

- **WHEN** un administrador abre `/admin` en un viewport móvil
- **THEN** la navegación se presenta como drawer con los mismos grupos y estados

### Requirement: Normalización de las pantallas de administración

Las pantallas de `/admin` SHALL heredar los tokens y la densidad del sistema, y NO SHALL conservar gradientes decorativos, glassmorphism, blobs, `hover:scale`, sombras grandes, grises crudos ni emojis en controles.

Las tablas, formularios, tarjetas y métricas SHALL mantener la legibilidad en tema oscuro y claro.

#### Scenario: Página de administración en tema oscuro

- **WHEN** el administrador abre una página de gestión en tema oscuro
- **THEN** los textos, bordes y superficies usan tokens Control Room y no grises fijos

#### Scenario: Página de administración en tema claro

- **WHEN** el administrador cambia al tema claro
- **THEN** la página conserva la misma jerarquía y contraste

### Requirement: Paridad funcional de administración

El rediseño SHALL preservar rutas, permisos, consultas, acciones y textos funcionales del panel de administración.

#### Scenario: Acción administrativa existente

- **WHEN** el administrador usa un botón, formulario o enlace existente
- **THEN** la acción conserva su destino y comportamiento
