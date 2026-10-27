# Tasks

## 1. Modelo y contrato de contenido

- [x] 1.1 Crear el esquema Zod y los tipos del contenido del sitio (global, hero, secciones, colecciones, SEO, contacto y redes) con límites de longitud; verificar con tests unitarios de validación y defaults.
- [x] 1.2 Agregar el modelo Prisma `SiteContent` (locale único, content JSON, version, updatedBy, updatedAt) y su migración; verificar con `npx prisma validate` y aplicando la migración en local.
- [x] 1.3 Crear el snapshot inicial del contenido actual del sitio y un seed idempotente que lo valide e inserte `es`/`en` solo si no existen; verificar ejecutando el seed dos veces y comprobando que no duplica filas.

## 2. API de administración y permisos

- [x] 2.1 Implementar `GET /api/admin/site-content` con sesión `ADMIN` y lectura por locale; verificar que sin sesión responde 401, con cliente 403 y con admin devuelve contenido y versión.
- [x] 2.2 Implementar `PUT /api/admin/site-content` con validación Zod, control de versión y persistencia; verificar 400 con payload inválido, 409 con versión vieja y guardado correcto con payload válido.
- [x] 2.3 Verificar que un guardado inválido o conflictivo no modifica el contenido publicado anterior; cubrirlo con tests del servicio/API.

## 3. Sección Sitio público en el panel

- [x] 3.1 Agregar la entrada **Sitio público** al grupo Contenido del sidebar, la ruta `/admin/sitio` y los textos i18n del panel; verificar que solo `ADMIN` accede y que el build del panel compila.
- [x] 3.2 Construir el editor con pestañas (General, Inicio, IA, Plataforma, Studio, Chat, Reproductores, FAQ, SEO, Contacto/Redes), selector ES/EN, guardado por idioma, versión y fecha de actualización; verificar con typecheck, build y una prueba manual de guardado.
- [x] 3.3 Integrar los campos de imagen con el uploader existente del panel y guardar URLs absolutas; verificar subiendo una imagen y viéndola en el sitio.
- [x] 3.4 Mostrar en el editor el enlace al sitio y la nota de propagación por caché (~60 s); verificar que el texto y el enlace son visibles.

## 4. API pública de contenido

- [x] 4.1 Implementar `GET /api/public/site-content` con `locale` (`es`/`en`), default `es`, CORS y cabeceras de caché pública; verificar respuestas para ambos idiomas y para un locale inválido.
- [x] 4.2 Devolver `content: null` cuando no haya contenido publicado o el JSON guardado no valide, sin exponer datos corruptos; verificar con tests de contenido ausente e inválido.
- [x] 4.3 Verificar que la API pública es solo de lectura y no acepta escritura sin autenticación.

## 5. Consumo desde el sitio público

- [x] 5.1 Crear el cliente de contenido del sitio con timeout corto, caché en memoria de ~60 s, merge profundo con defaults y fallback ante error; verificar con tests de respuesta válida, panel caído y JSON inválido.
- [x] 5.2 Adaptar `index`, `ia` y `caracteristicas` para consumir el contenido resuelto en lugar de solo las constantes; verificar que typecheck, tests y build del sitio pasan.
- [x] 5.3 Leer desde el panel el SEO, contacto y redes sociales con fallback a los valores actuales; verificar metadatos y enlaces en el HTML renderizado.
- [x] 5.4 Verificar el fallback EN → ES → estático en un campo sin traducción; cubrirlo con un test del cliente de contenido.

## 6. Integración, despliegue y documentación

- [ ] 6.1 Aplicar migración y seed en el panel desplegado y verificar `/admin/sitio` y `/api/public/site-content` en producción.
- [ ] 6.2 Sincronizar y reconstruir el sitio una vez para activar el consumo de la API; verificar que un cambio del panel aparece en casterfly.com dentro de la ventana de caché y que el sitio sigue funcionando con la API caída.
- [x] 6.3 Documentar la operación: cómo editar contenido, dónde se publica, tiempo de caché, deploy único del sitio y rollback; verificar que los comandos y enlaces documentados coinciden con la realidad.
- [x] 6.4 Confirmar que noticias, tutoriales, portafolio, mensajes y planes siguen en sus flujos actuales, y que el cambio no toca el agente ni requiere "Actualizar nodo".
