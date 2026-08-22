## 1. UI — Conexión OBS

- [x] 1.1 En `app/dashboard/television/connection/page.tsx` cambiar el título de la sección "Conexión Universal (H.264 / H.265)" a "Conexión Universal (H.264)"
- [x] 1.2 En el mismo archivo, actualizar la nota de ayuda para indicar que se debe usar un encoder H.264 estándar (x264/NVENC) con "enhanced streaming" desactivado, y que HEVC/AV1 produce pantalla negra

## 2. Verificación

- [x] 2.1 Verificar que el texto nuevo no rompe el layout ni el copy-paste de la URL relay (`relayServerUrl`) y stream key
- [ ] 2.2 Deploy a producción (push a main) y confirmar que la página de conexión muestra el requisito H.264
