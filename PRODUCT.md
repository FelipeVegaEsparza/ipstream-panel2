# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

El usuario principal es el dueño o encargado de una emisora de radio y/o canal de TV que usa CasterFly para operar su medio en el día a día. También existe un administrador de plataforma que gestiona clientes, nodos, planes y configuración global; sus pantallas comparten los mismos tokens visuales, pero no son el foco de esta primera fase.

## Product Purpose

CasterFly permite a una emisora gestionar su operación y su contenido en un solo panel: streaming de radio, televisión, AutoDJ, locutor IA, biblioteca de música, sitios de cliente, analítica, facturación y comunicación con la audiencia. El éxito del panel es que el operador encuentre rápido el estado de su emisora y complete sus tareas sin sentirse frente a una herramienta improvisada.

## Positioning

CasterFly se posiciona como una plataforma todo-en-uno de radio, TV e IA para emisoras que necesitan operar y publicar desde un mismo lugar, sin integrar por separado streaming, automatización, locución, sitio web y facturación.

## Operating Context

El panel se usa en jornadas de operación real: revisar si la radio o la TV están al aire, mirar oyentes y espectadores, abrir la consola en vivo, programar contenido, subir música y videos, gestionar avisos y pagos. El operador suele alternar entre tareas de emisión y tareas de contenido, y necesita reconocer de un vistazo qué requiere atención.

## Capabilities and Constraints

- Radio y TV con AutoDJ, DJ en vivo, parrilla horaria, biblioteca y playlists.
- Locutor IA, jingles, cápsulas y consumo de créditos de IA.
- Sitios de cliente, dominios, analítica y facturación multi-moneda.
- Administración de clientes, nodos de streaming, planes y configuración global.
- La interfaz debe funcionar en español e inglés.
- Debe existir tema oscuro y tema claro, ambos cuidados.
- El rediseño no puede alterar rutas, permisos, datos, APIs ni flujos funcionales existentes.
- El panel incluye superficies de operación diaria y superficies de administración; comparten tokens, pero pueden tener distinta densidad.

## Brand Commitments

- El nombre y el logo de CasterFly se conservan.
- La paleta de marca, con el cyan como acento principal, se conserva; el rediseño cambia cómo se aplica, no la identidad.
- El tono debe ser profesional y operativo, no publicitario ni infantil.

## Evidence on Hand

- Implementación real del panel en Next.js/React/Tailwind bajo `app/dashboard` y `components/dashboard`.
- Sistema de tokens existente en `app/globals.css` y `tailwind.config.js`.
- Logo y assets de marca en `public/` (`logo-casterfly.png`, `logo-casterfly-dark.png`).
- Textos bilingües existentes en `lib/dashboard-i18n.ts`.
- No hay testimonios, métricas de clientes ni material de prensa que pueda usarse como prueba; no inventarlos.

## Product Principles

1. El estado operativo manda: si la emisora está al aire y qué necesita atención debe verse antes que la decoración.
2. Una sola plataforma, muchas tareas: la navegación debe hacer predecible dónde vive cada cosa.
3. Profesionalismo sin fricción: densidad y precisión para operadores, sin exigir conocimiento técnico avanzado.
4. La marca se expresa en detalles precisos, no en efectos llamativos.
5. El panel debe sentirse confiable en una jornada larga: legible, estable y consistente en ambos temas.
