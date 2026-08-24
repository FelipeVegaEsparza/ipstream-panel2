# Project Instructions

## Infrastructure / Deploy

- Producción se despliega vía GitHub Actions en un VPS propio del usuario.
- El usuario tiene acceso SSH al VPS de producción; se puede usar para tareas de deploy, pruebas y diagnóstico.
- Flujo habitual: commit + push a `main` → GitHub Actions despliega automáticamente en el VPS.
