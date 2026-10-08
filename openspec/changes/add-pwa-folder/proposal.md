# Proposal

## Why

La app PWA que consumen los clientes (React 19 + Vite, ya desarrollada) vive hoy en un proyecto aparte. Queremos desarrollar panel y PWA como un solo ecosistema (un historial, PRs atómicos, y a futuro tipos/contratos compartidos) sin arriesgar el panel: es multi-tenant y está en desarrollo, así que un build roto nos cuesta caro. Este cambio integra la PWA al repo **sin cambiar el comportamiento del panel**.

## What Changes

- **Nueva carpeta `pwa/`** en la raíz del repo con el contenido de la app PWA existente (su propio `package.json`, dependencias, config de Vite y build). Se aísla por completo del panel.
- **Sin `npm workspaces`**: `pwa/` resuelve sus dependencias con su propio `node_modules` (gitignored). Se evita el hoisting de React 19 sobre el React 18 del panel y el quiebre de `npm ci` en el build de Docker.
- **Aislamiento del tooling del panel** (para que `next build`, `next lint`, el `tsc` raíz y el build de Docker sigan exactamente igual):
  - `tsconfig.json`: excluir `pwa` del type-check del panel.
  - `.dockerignore`: excluir `pwa/` del contexto de build de la imagen del panel.
  - `.gitignore`: excluir artefactos de la PWA (`pwa/node_modules`, `pwa/dist`, etc.).
  - `.github/workflows/deploy.yml`: que un cambio que solo toca `pwa/**` no dispare el deploy del panel (evitar deploys inútiles).
- **Reversible**: borrar `pwa/` y revertir las 4 exclusiones deja el repo como está hoy.

Explícitamente fuera de alcance (fases futuras, en cambios separados): servir el bundle de la PWA, resolución de tenant por dominio, aprovisionamiento de dominios/subdominios por cliente, manifest dinámico, y `packages/shared`.

## Capabilities

### New Capabilities

Ninguna. Es un cambio de estructura de repo / tooling, sin cambios de comportamiento observable en el panel ni en la PWA (`.openspec.yaml` declara `skip_specs: true`).

### Modified Capabilities

Ninguna.

## Impact

- **Nuevo árbol**: `pwa/` (app existente copiada, con su propio toolchain: Vite 8, React 19, react-query 5, hls.js, Vitest, oxlint, `tsc -b`).
- **Archivos del panel tocados (solo exclusión, sin lógica)**:
  - `tsconfig.json` (`exclude`)
  - `.dockerignore`
  - `.gitignore`
  - `.github/workflows/deploy.yml` (`paths-ignore` / filtro)
- **Sin tocar**: `app/`, `components/`, `lib/`, `prisma/`, `streaming/`, `docker-compose*.yml`, `lib/node-provisioner.ts`, `Dockerfile`. El provisioning de nodos remotos (`cp -r "${D}streaming"`) no se ve afectado.
- **Dependencias**: ninguna nueva en el panel. La PWA mantiene las suyas aisladas.
