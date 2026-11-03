# Spec Delta

## Purpose

Reseñas habladas del artista o del tema por parte del locutor IA: el cliente activa una reseña cada cierta cantidad de temas, el sistema la redacta con DeepSeek, la sintetiza con la voz de la radio y la intercala en el AutoDJ y en la consola en vivo, sin repetir llamadas ni gastar cuota de más.

## ADDED Requirements

### Requirement: El cliente activa las reseñas con su propia frecuencia

La radio SHALL tener una configuración de reseñas independiente de la presentación, la hora y el clima. El cliente SHALL poder activarlas y elegir cada cuántos temas suena una reseña. El valor `0` SHALL significar desactivadas.

#### Scenario: Activar reseñas cada cinco temas
- **WHEN** el cliente activa las reseñas y configura la frecuencia en 5
- **THEN** el sistema programa una reseña antes de un tema cada 5 temas de la playlist
- **AND** la presentación del locutor mantiene su frecuencia propia sin cambios

#### Scenario: Desactivar reseñas
- **WHEN** el cliente configura la frecuencia en 0 o desactiva la opción
- **THEN** no se genera ni se emite ninguna reseña
- **AND** las presentaciones, hora y clima siguen funcionando igual

#### Scenario: Frecuencia inválida
- **WHEN** el cliente intenta guardar una frecuencia fuera del rango permitido
- **THEN** el sistema rechaza el valor con un mensaje claro y conserva la configuración anterior

### Requirement: El cliente elige el estilo de la reseña

El sistema SHALL ofrecer estilos de reseña seleccionables: dato curioso, detrás de la canción, contexto histórico y biografía del artista. El estilo elegido SHALL aplicar a las reseñas de esa radio.

#### Scenario: Elegir un estilo
- **WHEN** el cliente selecciona "contexto histórico"
- **THEN** las reseñas que se generen a partir de ese momento usan ese estilo

#### Scenario: Cambiar de estilo
- **WHEN** el cliente cambia el estilo y vuelve a aplicar
- **THEN** las reseñas del estilo anterior dejan de emitirse y se generan las del nuevo estilo

### Requirement: La reseña se redacta con DeepSeek y prioriza datos descriptivos

El sistema SHALL generar el texto de cada reseña con DeepSeek a partir del artista, el título y el estilo. El texto SHALL priorizar datos descriptivos y verificables por escucha (género, época, instrumentación, estructura, mood, tema de la letra). El sistema SHALL usar datos históricos o biográficos solo cuando el modelo los marque como seguros.

El sistema SHALL excluir del texto: fechas exactas de grabación, posiciones en listas, premios, cifras de venta, anécdotas puntuales no verificables, y cualquier referencia a muerte, escándalos, política, religión o vida privada.

#### Scenario: Canción sin historia conocida
- **WHEN** el modelo no tiene un dato histórico confiable sobre el tema
- **THEN** la reseña describe la canción (sonido, estructura, mood) en lugar de afirmar un dato histórico

#### Scenario: Contenido prohibido
- **WHEN** el modelo propone un dato con fecha exacta, cifra de ventas o un tema sensible
- **THEN** esa propuesta se descarta y el sistema usa una descripción o no emite reseña para ese tema

#### Scenario: Falla de DeepSeek
- **WHEN** DeepSeek no responde o devuelve una respuesta inválida para un tema
- **THEN** ese tema se saltea sin reseña
- **AND** la preparación del AutoDJ continúa con el resto de los temas

### Requirement: La reseña se cachea y no se vuelve a pagar

El sistema SHALL guardar cada reseña generada por cliente, artista, título y estilo, y SHALL reutilizarla cuando el mismo tema vuelva a aparecer o cuando suene en la consola en vivo. Una reseña cacheada SHALL NOT volver a llamar a DeepSeek ni volver a consumir cuota de TTS.

#### Scenario: Tema repetido
- **WHEN** un tema con reseña ya generada vuelve a sonar o se vuelve a aplicar la playlist
- **THEN** el sistema reutiliza el texto y el audio existentes
- **AND** no se descuentan caracteres de cuota

#### Scenario: Mismo tema en otra radio
- **WHEN** otra radio genera una reseña del mismo tema
- **THEN** el audio puede reutilizarse por coincidencia de texto sin consumir cuota adicional

### Requirement: La reseña respeta un tope de veinte segundos

El sistema SHALL limitar el audio de cada reseña a 20 segundos. Si el audio generado supera el tope, el sistema SHALL acortar el texto en el último punto anterior al límite y regenerar el audio una vez.

#### Scenario: Audio dentro del tope
- **WHEN** el audio generado dura 20 segundos o menos
- **THEN** se usa tal cual

#### Scenario: Audio excedido
- **WHEN** el audio generado supera los 20 segundos
- **THEN** el sistema recorta el texto en el último punto completo y regenera
- **AND** si aun así supera el tope, la reseña se descarta

### Requirement: La reseña se intercala antes de su tema en el AutoDJ

El sistema SHALL anclar cada reseña al tema que presenta mediante el identificador del tema y SHALL insertarla inmediatamente antes de ese tema en la playlist del AutoDJ. Cuando el mismo tema tenga presentación y reseña, el orden SHALL ser presentación, reseña y tema. La reseña SHALL seguir a su tema aunque la playlist se reordene.

#### Scenario: Presentación y reseña en el mismo tema
- **WHEN** un tema coincide con la frecuencia de presentación y con la de reseña
- **THEN** el oyente escucha primero la presentación, luego la reseña y después el tema

#### Scenario: Playlist reordenada
- **WHEN** el cliente reordena la playlist y vuelve a aplicar
- **THEN** cada reseña sigue sonando antes del tema que le corresponde

#### Scenario: Desactivar reseñas en una radio con AutoDJ activo
- **WHEN** el cliente desactiva las reseñas
- **THEN** las reseñas dejan de sonar en el siguiente reinicio del AutoDJ
- **AND** las presentaciones configuradas siguen emitiéndose

### Requirement: La consola en vivo también emite reseñas

La consola en vivo SHALL emitir una reseña cada la cantidad de temas configurada, con contador propio e independiente del contador de presentaciones. La reseña SHALL prepararse con antelación al tema siguiente y SHALL reproducirse completa antes de que entre la canción, sin superar los 20 segundos.

#### Scenario: Reseña en la consola en vivo
- **WHEN** el operador reproduce temas desde la consola y se cumple la frecuencia configurada
- **THEN** antes del tema siguiente se reproduce la reseña correspondiente
- **AND** el contador de presentaciones no se altera

#### Scenario: Tema local sin metadatos completos
- **WHEN** el tema de la consola no tiene artista o título
- **THEN** el sistema no emite reseña para ese tema y continúa la reproducción normalmente

### Requirement: El cliente revisa y desactiva reseñas individuales

El panel SHALL mostrar las reseñas generadas para la radio con su tema, texto y reproducción de audio. El cliente SHALL poder regenerar una reseña y desactivarla individualmente. Una reseña desactivada SHALL NOT emitirse en AutoDJ ni en consola en vivo.

#### Scenario: Desactivar una reseña
- **WHEN** el cliente desactiva la reseña de un tema
- **THEN** ese tema deja de llevar reseña en la próxima aplicación
- **AND** el resto de las reseñas no se modifica

#### Scenario: Regenerar una reseña
- **WHEN** el cliente regenera una reseña
- **THEN** se solicita un texto nuevo a DeepSeek y se reemplaza el audio anterior de ese tema

### Requirement: El admin puede desactivar las reseñas por radio

El sistema SHALL ofrecer al administrador un interruptor por radio que desactive las reseñas con independencia de la configuración del cliente. Si el interruptor está apagado, la función SHALL quedar deshabilitada para esa radio aunque el cliente la tenga configurada.

#### Scenario: Admin desactiva la función
- **WHEN** el administrador apaga las reseñas de una radio
- **THEN** el cliente no puede activarlas ni aplicarlas
- **AND** las reseñas ya generadas dejan de emitirse

#### Scenario: Admin vuelve a habilitar
- **WHEN** el administrador vuelve a habilitar las reseñas
- **THEN** la configuración previa del cliente se respeta y las reseñas vuelven a emitirse

### Requirement: Solo el audio consume cuota de IA

El sistema SHALL descontar de la cuota mensual únicamente los caracteres sintetizados a voz, y SHALL NO descontar el texto generado por DeepSeek ni las reproducciones que usan audio ya cacheado.

#### Scenario: Primera emisión de una reseña
- **WHEN** se genera el audio de una reseña nueva
- **THEN** se descuentan los caracteres del texto sintetizado

#### Scenario: Reseña repetida
- **WHEN** una reseña ya sintetizada vuelve a emitirse
- **THEN** no se descuenta cuota

#### Scenario: Cuota insuficiente
- **WHEN** la cuota restante no alcanza para las reseñas pedidas
- **THEN** el sistema informa cuántos caracteres hacen falta y no genera audio nuevo

### Requirement: Sin DeepSeek o sin TTS la función queda deshabilitada, no rota

El sistema SHALL deshabilitar la sección de reseñas cuando no haya clave de DeepSeek o no haya proveedor de voz premium configurado, manteniendo operativas las demás locuciones.

#### Scenario: Sin clave de DeepSeek
- **WHEN** el panel no tiene `DEEPSEEK_API_KEY`
- **THEN** la sección muestra que la función no está disponible
- **AND** presentaciones, hora y clima siguen funcionando

#### Scenario: Sin proveedor de voz
- **WHEN** no hay ElevenLabs ni Fish Audio configurados
- **THEN** no se ofrece generar reseñas y se explica el motivo
