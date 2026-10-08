# Tasks

## 1. Importar la PWA al repo

- [x] 1.1 Agregar a `.gitignore` las entradas de artefactos de la PWA (`pwa/node_modules`, `pwa/dist`, `pwa/.vite`) antes de copiar, y verificar con `git status` que no aparezcan `pwa/node_modules` ni `pwa/dist` como pendientes.
- [x] 1.2 Copiar el contenido del proyecto PWA existente dentro de `pwa/`, excluyendo `node_modules`, `dist`, `.git` y caches; verificar que queden presentes `pwa/package.json`, `pwa/vite.config.*`, `pwa/src/` y `pwa/index.html`.
- [x] 1.3 Instalar y construir la PWA de forma independiente (`cd pwa && npm install && npm run build`) y verificar que se genere `pwa/dist/` y que pasen sus checks propios (`tsc -b`, `oxlint`, `vitest` según los scripts de `pwa/package.json`).

## 2. Aislar `pwa/` del tooling del panel

- [x] 2.1 Agregar `"pwa"` al `exclude` de `tsconfig.json` y verificar con `npx tsc --noEmit` (o `npm run build`) que no aparezcan errores de tipos originados en `pwa/`.
- [x] 2.2 Agregar `pwa/` a `.dockerignore` y verificar que el contexto de build del panel ya no incluya archivos de la PWA.
- [x] 2.3 Confirmar que `.gitignore` deja fuera `pwa/node_modules` y `pwa/dist` ejecutando `git status` tras el build de la PWA: no deben listarse.
- [x] 2.4 Agregar `pwa/**` a `paths-ignore` en `.github/workflows/deploy.yml` y verificar que el YAML siga siendo válido y que la lista de paths no excluya archivos del panel.

## 3. Verificación de integración

- [x] 3.1 Ejecutar `npm run build` y `npm run lint` en la raíz y verificar que el panel compila y lintea exactamente como antes (sin archivos de `pwa/` en la salida).
- [x] 3.2 Construir la imagen Docker del panel (`docker build -t ipstream-panel-test .`) y verificar que el build termine OK y que el contexto/imagen no incluya `pwa/`.
- [x] 3.3 Documentar en `AGENTS.md` la existencia de `pwa/`, su independencia de dependencias (sin workspaces) y las 4 reglas de aislamiento, con verificación de que el texto coincide con lo implementado.
- [x] 3.4 Push a `main` y verificar en GitHub Actions que el deploy del panel corre igual que siempre; comprobar además que un commit que solo toca `pwa/**` no dispara el deploy del panel.
