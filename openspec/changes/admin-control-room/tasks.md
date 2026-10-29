# Tasks

## 1. Shell de administración

- [x] 1.1 Agregar `.admin-shell` con tokens, tipografía Archivo/Martian y reglas de normalización en `app/globals.css`.
- [x] 1.2 Aplicar `.admin-shell` y las variables de fuente en `app/admin/layout.tsx`; verificar que el sitio público no cambia.
- [x] 1.3 Rediseñar `AdminSidebar.tsx` con rail plano, grupos en sentence case, items de 36px y badge compacto; verificar desktop y móvil.
- [x] 1.4 Rediseñar `AdminHeader.tsx` y `AdminLayoutClient.tsx` a 56px, ancho 1440px y controles compactos; verificar rutas y props.

## 2. Normalización de pantallas

- [x] 2.1 Reemplazar grises crudos, gradientes decorativos, blur, sombras, `hover:scale` y radios heredados en `app/admin/**` y `components/admin/**`.
- [x] 2.2 Reemplazar acentos indigo/blue/purple y emojis de UI por tokens o iconos; verificar con búsqueda de patrones.
- [x] 2.3 Revisar tablas, formularios y modales de admin en dark/light; corregir desbordes y contrastes evidentes.

## 3. Verificación

- [x] 3.1 Ejecutar `npx tsc --noEmit`, `npm test` y `npx next build`.
- [x] 3.2 Ejecutar el detector de Impeccable sobre `app/admin` y `components/admin`; corregir hallazgos mecánicos.
- [ ] 3.3 Deployar el panel y verificar en producción que `/admin` carga en ambos temas sin errores.
