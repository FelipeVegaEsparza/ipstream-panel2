# Design

## Context

Ver `proposal.md - Why`. Estado actual relevante:

- El panel vive en la raíz del repo y es el único proyecto del árbol (`package.json`, `tsconfig.json`, `Dockerfile`, `docker-compose*.yml` y `.github/workflows/deploy.yml` asumen "el repo ES el panel").
- La PWA es un proyecto React 19 + Vite 8 ya desarrollado y separado: su `package.json` no tiene nada que ver con el del panel (React 18, Next 14).
- Restricción dura: el panel no debe romperse. El deploy de nodos remotos (`lib/node-provisioner.ts`) descarga el tarball del repo y asume `streaming/` en la raíz; cualquier cosa que mueva o rompa esa ruta rompe el botón "Actualizar nodo".

## Goals / Non-Goals

**Goals:**
- Integrar la PWA al repo en `pwa/`, copiendo el proyecto existente tal cual (sin reescribir su código).
- Aislar `pwa/` de todo el tooling del panel para que `next build`, `next lint`, `tsc` raíz, el build de Docker y el CI sigan produciendo exactamente el mismo resultado que hoy.
- Que un cambio que solo toca `pwa/**` no dispare un deploy innecesario del panel.

**Non-Goals:**
- Servir el bundle de la PWA (host/estático) — fase futura.
- Resolución de tenant por dominio, `ClientDomain`, manifest dinámico, aprovisionamiento de subdominios/dominios — fase futura.
- `packages/shared` / compartir tipos y zod — fase futura (requiere decidir el modelo de workspaces).
- Cambiar cualquier comportamiento del panel o de la PWA.

## Decisions

### 1. `pwa/` como carpeta hermana SIN `npm workspaces`
`pwa/` mantiene su propio `package.json` y su propio `node_modules` (gitignored). No se agrega `"workspaces"` al `package.json` raíz.

- **Por qué:** es el único esquema que aísla por completo los dos árboles de dependencias. Panel y PWA tienen majors distintos de React; con workspaces npm hoistea y puede resolver React 19 para el panel.
- **Alternativa considerada — npm/pnpm workspaces:** más "correcto" para compartir código a futuro, pero introduce (a) conflicto de hoisting React 18/19, (b) `npm ci` del `Dockerfile:35` exige `pwa/package.json` presente cuando la raíz declara workspaces, y hoy el stage de deps solo copia `package.json`+`package-lock.json`+`prisma` (`Dockerfile:29-30`), y (c) reescritura completa del lockfile del panel. Se descarta por ahora; se reevaluará junto con `packages/shared`.
- **Alternativa considerada — repo separado:** descartada por decisión del usuario (quiere el ecosistema junto).

### 2. Aislamiento en exactamente 4 puntos
Ninguno toca lógica del panel; son exclusiones/config:

1. **`tsconfig.json`** — agregar `"pwa"` a `exclude`. Hoy incluye `"**/*.ts"`/`"**/*.tsx"` (`tsconfig.json:30-35`) y `next build` type-checkea con `ignoreBuildErrors: false` (`next.config.js:18-20`); sin excluir, el panel intentaría tipar React 19/Vite y fallaría.
2. **`.dockerignore`** — agregar `pwa/`. El builder hace `COPY . .` (`Dockerfile:45`); sin exclusión, mete la PWA (y su `dist/`) en cada build de la imagen del panel.
3. **`.gitignore`** — agregar `pwa/node_modules` (el patrón `node_modules/` actual probablemente ya lo cubre, pero se explicita) y `pwa/dist`, `pwa/.vite`. `dist` no está en `.gitignore` hoy.
4. **`.github/workflows/deploy.yml`** — sumar `pwa/**` a `paths-ignore` (o filtro equivalente) para no rebuildear/deployar el panel por cambios que solo tocan la PWA.

- **Por qué exclusión explícita y no "dejar que lo ignore solo":** cada punto es una fuente real de quiebre; hacerlos visibles y testables reduce el riesgo a casi cero y documenta la frontera.

### 3. Copiar la PWA tal cual, sin adaptarla
El contenido de `pwa/` es la app existente sin cambios de código. Así la integración es puramente estructural y reversible, y no mezcla "mover la app" con "adaptarla al ecosistema".

## Risks / Trade-offs

- **`tsconfig` sigue levantando archivos de `pwa/`** → Se agrega `"pwa"` a `exclude` y se verifica con `npx tsc --noEmit` y `npm run build` que no aparezcan errores de tipos de la PWA. Si `next build` igual los levanta, verificar que `exclude` use la forma de path correcta (sin glob) reconocida por TypeScript.
- **Contexto de build de Docker crece o incluye `pwa/node_modules`** → `.dockerignore` con `pwa/`; se valida con un `docker build` local comparando tamaño/tiempo.
- **Cambios en `pwa/` disparan deploy del panel** → `paths-ignore` en el workflow. Trade-off: si un mismo PR toca panel y PWA, el deploy del panel sí corre (correcto).
- **Copia accidental de artefactos de build de la PWA** (`dist/`, `node_modules/`, `.vite/`) → `.gitignore` antes de copiar, y revisar `git status` tras el copiado.
- **A futuro, compartir tipos sin workspaces es incómodo** → aceptado; se difiere a un cambio dedicado (`packages/shared` + decisión de workspaces).

## Migration Plan

1. Copiar el contenido del proyecto PWA dentro de `pwa/` (excluyendo `node_modules`, `dist`, `.git`, caches).
2. Aplicar las 4 exclusiones (tsconfig, .dockerignore, .gitignore, workflow).
3. Verificar el panel intacto: `npm run build`, `npm run lint`, y build de Docker local.
4. Verificar la PWA independiente: `cd pwa && npm install && npm run build`.
5. Commit + push; confirmar en GitHub Actions que el panel deploya igual que siempre.

**Rollback:** `rm -rf pwa/` y revertir las 4 exclusiones. El repo queda idéntico al estado actual; ningún artefacto del panel (imagen, compose, volume, nodos) se ve afectado.

## Open Questions

- ¿La PWA se servirá desde el Caddy del panel (estático, mismo dominio) o desde un host/CDN aparte (Cloudflare Pages)? No cambia este cambio ni sus tareas; se decide en la fase de deploy de la PWA.
