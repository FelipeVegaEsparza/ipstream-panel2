# Tasks

## 1. Card del servidor

- [x] 1.1 Agregar la fila "Última actualización" en la card de `components/admin/StreamingServersManager.tsx`, mostrando `provisionedAt` con fecha y hora (usar `formatDate(date, true)` de `lib/billing-format`) y "—" cuando sea null, verificando el render con un servidor actualizado y con uno sin fecha
- [x] 1.2 Verificar que `npm run build` compila y revisar visualmente `/admin/servers` (con `provisionedAt` presente y ausente)
