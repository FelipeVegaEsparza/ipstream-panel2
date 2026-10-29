# Spec Delta

## Purpose

Define el lenguaje visual Control Room del shell y la home del panel del cliente, para que la operación de radio/TV se lea como una herramienta profesional y no como una plantilla generada.

## ADDED Requirements

### Requirement: Shell de operación unificado

El shell del panel del cliente SHALL usar superficies planas, bordes de 1px y radios contenidos. La navegación lateral y la barra superior SHALL ser estables, legibles y consistentes en escritorio y móvil.

El shell NO SHALL usar gradientes decorativos, glassmorphism, blobs, sombras grandes en superficies base ni animaciones de escala al pasar el cursor.

El estado activo de navegación SHALL distinguirse por tipografía, contraste y una marca de señal discreta, no por un fondo brillante que compita con el contenido.

#### Scenario: Shell en tema oscuro

- **WHEN** el operador abre una página del dashboard en tema oscuro
- **THEN** ve un rail lateral plano, un header de altura compacta con borde inferior y contenido sobre una superficie de contraste estable
- **AND** no hay gradientes, blobs ni glassmorphism en el shell

#### Scenario: Shell en tema claro

- **WHEN** el operador cambia al tema claro
- **THEN** el shell conserva la misma jerarquía, densidad y estados
- **AND** los textos y controles mantienen contraste legible

#### Scenario: Shell en móvil

- **WHEN** el operador abre el panel en un viewport móvil
- **THEN** la navegación se presenta como un drawer con los mismos grupos y estados
- **AND** el contenido principal no queda tapado por el header ni por el drawer

### Requirement: Home centrada en el estado al aire

La home del cliente SHALL presentar primero el estado operativo de la emisora. La franja **On Air** SHALL mostrar el estado de radio y TV, el tema o programa actual, el siguiente elemento cuando exista, la audiencia y la acción principal para abrir la consola correspondiente.

Las métricas de almacenamiento, créditos IA, PWA y plan SHALL presentarse como una fila compacta de lectura rápida, no como tarjetas multicolor independientes.

Los avisos accionables (onboarding pendiente, datos básicos incompletos, pago próximo o vencido, cuota excedida) SHALL agruparse en una zona de atención y NO SHALL competir visualmente con el estado al aire.

#### Scenario: Radio y TV al aire

- **WHEN** el cliente tiene radio y TV activas
- **THEN** la home muestra ambas señales dentro de la franja On Air con su estado, audiencia y acción para abrir la consola

#### Scenario: Sin transmisión activa

- **WHEN** el cliente no tiene una transmisión al aire
- **THEN** la franja On Air muestra un estado vacío que explica cómo iniciar la emisión
- **AND** no muestra una tarjeta vacía o un espacio roto

#### Scenario: Aviso de pago y onboarding

- **WHEN** hay onboarding pendiente y un pago próximo
- **THEN** ambos aparecen agrupados en la zona de atención con una acción clara
- **AND** el estado al aire sigue siendo el bloque visual dominante

### Requirement: Color y tipografía con función

El cyan de marca SHALL reservarse para señal, foco, enlaces y acciones primarias. Los estados SHALL usar color semántico: verde para activo/en vivo, ámbar para advertencia y rojo para error o vencimiento.

La interfaz NO SHALL usar colores decorativos sin significado ni una paleta arcoíris para métricas.

Las métricas numéricas SHALL alinearse y usar cifras tabulares para que los valores cambien sin saltos de ancho.

#### Scenario: Estado en vivo

- **WHEN** una radio o TV está al aire
- **THEN** el estado se comunica con el color semántico de vivo y un indicador discreto
- **AND** el cyan de marca no se usa como decoración de fondo

#### Scenario: Valores que cambian

- **WHEN** cambian oyentes, espectadores, almacenamiento o créditos
- **THEN** los números conservan alineación y ancho estable

### Requirement: Paridad funcional, temas e idiomas

El rediseño SHALL preservar rutas, permisos, datos, textos funcionales y acciones existentes. NO SHALL introducir nuevas reglas de negocio, endpoints ni estados de datos.

La interfaz SHALL seguir funcionando en español e inglés y en tema oscuro y claro.

#### Scenario: Acción existente

- **WHEN** el operador usa un enlace o botón que ya existía en la home o el shell
- **THEN** la acción conserva su destino y comportamiento

#### Scenario: Cambio de idioma

- **WHEN** el operador cambia el idioma del panel
- **THEN** el shell y la home muestran los textos en el idioma elegido sin desbordes ni recortes

### Requirement: Sistema visual documentado y verificable

Las decisiones visuales SHALL quedar tokenizadas en el sistema central y documentadas en `DESIGN.md`. El resultado SHALL poder auditarse con el detector de Impeccable y con una revisión visual en escritorio y móvil.

#### Scenario: Revisión de anti-patrones

- **WHEN** se ejecuta el detector sobre los archivos del shell y la home
- **THEN** no quedan hallazgos mecánicos de gradientes decorativos, glassmorphism, blobs, `hover:scale` ni emojis en controles

#### Scenario: Documentación del sistema

- **WHEN** otro agente o desarrollador abre `DESIGN.md`
- **THEN** encuentra la paleta, tipografía, radios, espaciado, estados y reglas de composición del Control Room
