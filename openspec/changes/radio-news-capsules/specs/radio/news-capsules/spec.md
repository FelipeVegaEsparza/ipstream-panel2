# Spec Delta

## Purpose

Permite a cada radio crear cápsulas de noticias a partir de fuentes RSS o URLs, generar una locución con intro, contenido y cierre usando el Locutor IA, previsualizarlas y programarlas para que suenen en el AutoDJ sin interrumpir la música.

## ADDED Requirements

### Requirement: Ingesta de fuentes de noticias

El sistema SHALL permitir crear una cápsula desde una o más fuentes RSS, un feed Atom o una URL de artículo, y SHALL mostrar los ítems disponibles para elegir antes de generar el contenido. El cliente MUST poder editar el texto de respaldo cuando la fuente no esté disponible.

#### Scenario: Feed RSS con varios ítems
- **WHEN** el cliente agrega la URL de un feed RSS válido
- **THEN** el sistema muestra los ítems recientes con título, fecha y fuente para elegir uno o varios

#### Scenario: URL de artículo
- **WHEN** el cliente pega la URL pública de un artículo
- **THEN** el sistema extrae título, fecha, medio y texto principal, y permite seleccionarlo como fuente de la cápsula

#### Scenario: Fuente caída o inválida
- **WHEN** la fuente no responde, excede el tiempo límite o no contiene texto utilizable
- **THEN** el sistema muestra un error claro y conserva la opción de escribir el texto manualmente

### Requirement: Resumen y guion de la cápsula

El sistema SHALL generar un resumen periodístico breve a partir de las fuentes elegidas y SHALL guardar la atribución de cada fuente. El guion MUST dividirse en intro, contenido y cierre, y MUST poder editarse antes de generar el audio.

#### Scenario: Resumen generado
- **WHEN** el cliente elige uno o más ítems y solicita generar el guion
- **THEN** el sistema produce un resumen con intro, cuerpo y cierre, sin copiar extensamente el artículo original y mostrando las fuentes utilizadas

#### Scenario: Edición del guion
- **WHEN** el cliente modifica la intro, el contenido o el cierre
- **THEN** el sistema guarda la nueva versión y marca la aprobación anterior como inválida


### Requirement: Varias noticias separadas por cápsula

Cada cápsula SHALL contener una intro, una o más noticias separadas y un cierre. El cliente MUST poder agregar noticias por URL o manualmente, ordenarlas y quitarlas. La intro y el cierre MUST tener un texto fijo por defecto y MUST poder editarse. Cada noticia MUST tener su propio resumen de hasta 300 caracteres.

#### Scenario: Cápsula con tres noticias
- **WHEN** el cliente agrega tres noticias y genera el guion
- **THEN** la cápsula conserva tres resúmenes separados y el audio se ordena intro → noticia 1 → noticia 2 → noticia 3 → cierre

#### Scenario: Noticia manual
- **WHEN** el cliente agrega una noticia escribiendo el texto sin URL
- **THEN** la noticia se agrega a la lista y se resume igual que las provenientes de una fuente

#### Scenario: Edición de intro y cierre
- **WHEN** el cliente edita la intro o el cierre
- **THEN** el audio anterior se invalida y la cápsula vuelve a borrador

### Requirement: Locución con intro, contenido y cierre

El sistema SHALL generar la locución con la voz configurada del Locutor IA de la radio y SHALL entregar un único audio reproducible que contenga intro, contenido y cierre. La generación MUST respetar la cuota de IA del plan y SHALL informar el consumo estimado antes de generar.

#### Scenario: Generación completa
- **WHEN** el cliente genera el audio de una cápsula aprobada en texto
- **THEN** el sistema produce un audio único con intro, contenido y cierre, y registra el consumo de caracteres

#### Scenario: Cuota insuficiente
- **WHEN** la cuota de IA disponible es menor al consumo estimado
- **THEN** el sistema bloquea la generación, muestra el faltante y no consume caracteres

### Requirement: Música de fondo opcional

El sistema SHALL permitir elegir una pista activa de la misma biblioteca de música de los jingles para usar como fondo de cada cápsula. La selección MUST incluir las pistas globales del admin y las pistas propias del cliente, y la música MUST quedar incorporada al audio final para que la emisión no dependa de la biblioteca en tiempo real.

#### Scenario: Cápsula con música de fondo
- **WHEN** el cliente elige una pista activa de la biblioteca y genera el audio
- **THEN** el audio final contiene la locución mezclada con esa música de fondo y el preview reproduce la mezcla completa

#### Scenario: Cápsula sin música
- **WHEN** el cliente no elige música o selecciona “sin música”
- **THEN** la cápsula se genera solo con la locución, sin error

#### Scenario: Pista no disponible
- **WHEN** la pista elegida ya no existe, está inactiva o no pertenece al cliente
- **THEN** el sistema bloquea la generación con un mensaje claro y permite elegir otra pista o continuar sin música

#### Scenario: Cambio de música
- **WHEN** el cliente cambia la música de una cápsula ya aprobada
- **THEN** la aprobación y el audio anterior se invalidan, y la cápsula vuelve a borrador hasta generar y aprobar la nueva mezcla

#### Scenario: Derechos de la música
- **WHEN** el cliente elige una pista de la biblioteca
- **THEN** la interfaz recuerda que debe tener los derechos para transmitirla y que CasterFly no licencia la música

### Requirement: Preview y aprobación obligatorios

El sistema SHALL permitir escuchar el audio generado antes de programarlo. Una cápsula MUST estar aprobada de forma explícita y MUST tener un audio vigente para poder programarse; cualquier cambio de fuentes, guion, voz o audio MUST invalidar la aprobación y la programación activa.

#### Scenario: Intento de programar sin aprobar
- **WHEN** el cliente intenta activar una programación de una cápsula en borrador o sin audio
- **THEN** el sistema impide la activación e indica que debe escuchar y aprobar la cápsula

#### Scenario: Cambio posterior a la aprobación
- **WHEN** el cliente edita el guion o regenera el audio de una cápsula ya aprobada
- **THEN** la cápsula vuelve a estado borrador y sus reglas quedan pausadas hasta una nueva aprobación

### Requirement: Reglas de programación

Cada cápsula SHALL poder tener una o más reglas de programación: cada X temas, a horas específicas del día y/o cada N horas. Las reglas MUST evaluarse en la zona horaria del cliente y MUST respetar una ventana horaria y un rango de fechas opcionales.

#### Scenario: Cada cantidad de temas
- **WHEN** una cápsula tiene una regla de cada 5 temas y el AutoDJ termina el tema número 5
- **THEN** la cápsula queda candidata para sonar al finalizar ese tema, si está dentro de su ventana y no hay otra restricción

#### Scenario: Horas específicas
- **WHEN** una cápsula tiene reglas a las 08:00 y 14:00 y el AutoDJ está reproduciendo música a esa hora
- **THEN** la cápsula queda pendiente y suena al terminar el tema en curso, dentro de la tolerancia configurada

#### Scenario: Cada N horas
- **WHEN** una cápsula tiene una regla cada 2 horas y se cumple el intervalo
- **THEN** el sistema la considera candidata una sola vez por intervalo y evita duplicarla por reglas superpuestas

#### Scenario: Fuera de ventana
- **WHEN** la regla se cumple fuera de la ventana horaria, del rango de fechas o con la cápsula pausada
- **THEN** el sistema no la emite y registra el motivo

### Requirement: Emisión sin interrumpir la reproducción

El sistema SHALL insertar la cápsula únicamente entre temas, sin cortar la canción en curso. Si la hora objetivo pasa mientras suena un tema, la cápsula SHALL reproducirse al finalizar ese tema si aún está dentro de la tolerancia configurada; si la tolerancia expira, MUST omitirse y registrarse.

#### Scenario: Hora objetivo durante una canción
- **WHEN** la cápsula está programada para las 14:00 y a esa hora se está reproduciendo una canción
- **THEN** la cápsula espera el final de la canción y suena antes del siguiente tema, siempre que esté dentro de la tolerancia

#### Scenario: Tolerancia vencida
- **WHEN** la canción termina después de la tolerancia configurada para la hora objetivo
- **THEN** el sistema omite la emisión, registra el motivo y espera la próxima regla

#### Scenario: DJ en vivo
- **WHEN** hay un DJ transmitiendo en vivo al momento de la emisión
- **THEN** el sistema no interrumpe al DJ y omite o pospone la cápsula según la tolerancia

### Requirement: Prioridad, colisiones y frecuencia mínima

El sistema SHALL evitar solapamientos con especiales, jingles, cápsulas informativas y otras cápsulas de noticias. Cada cápsula MUST respetar una frecuencia mínima y una prioridad configurable; si dos cápsulas compiten por el mismo corte, MUST emitirse primero la de mayor prioridad y la otra SHALL esperar al siguiente corte dentro de su tolerancia.

#### Scenario: Colisión de dos cápsulas
- **WHEN** dos cápsulas de noticias están listas para el mismo corte
- **THEN** suena una sola, la de mayor prioridad, y la otra queda para el siguiente corte o se omite si expira

#### Scenario: Frecuencia mínima
- **WHEN** una cápsula ya sonó dentro de su frecuencia mínima
- **THEN** el sistema no vuelve a emitirla hasta que se cumpla el intervalo

### Requirement: Historial y próxima emisión

El sistema SHALL registrar cada ejecución con estado, fecha, hora, cápsula y motivo de omisión cuando corresponda. La interfaz MUST mostrar el estado de la cápsula y una estimación de la próxima emisión.

#### Scenario: Emisión exitosa
- **WHEN** una cápsula se reproduce en el AutoDJ
- **THEN** el historial muestra la fecha, hora y estado “emitida”

#### Scenario: Emisión omitida
- **WHEN** una cápsula no se reproduce por tolerancia, colisión, falta de audio o ventana
- **THEN** el historial muestra el motivo y la próxima oportunidad estimada

### Requirement: Seguridad, atribución y derechos de las fuentes

El sistema SHALL aceptar únicamente URLs públicas HTTP/HTTPS, SHALL limitar tiempo y tamaño de descarga y MUST bloquear destinos privados o locales. El resumen MUST incluir la atribución de las fuentes y no MUST reproducir extensamente el contenido original; el cliente sigue siendo responsable de los derechos de las noticias y de su emisión.

#### Scenario: URL privada
- **WHEN** el cliente intenta usar una URL local, privada o no HTTP/HTTPS
- **THEN** el sistema rechaza la fuente con un mensaje de seguridad

#### Scenario: Atribución visible
- **WHEN** una cápsula se genera desde una fuente externa
- **THEN** el guion y la ficha de la cápsula muestran el medio o la URL de origen

### Requirement: Ciclo de vida de la cápsula

El sistema SHALL permitir guardar borradores, pausar, reactivar, duplicar y eliminar cápsulas. Una cápsula pausada MUST conservar su configuración pero no MUST emitirse; eliminar una cápsula MUST retirar sus reglas y su audio de la programación futura.

#### Scenario: Pausar
- **WHEN** el cliente pausa una cápsula programada
- **THEN** deja de emitirse y conserva su guion, audio y reglas para reactivarla

#### Scenario: Eliminar
- **WHEN** el cliente elimina una cápsula
- **THEN** se eliminan sus reglas y no se emite en el futuro, manteniendo el historial de emisiones ya realizadas
