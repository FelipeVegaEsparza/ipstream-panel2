#!/usr/bin/env node
/**
 * Build de un cliente específico.
 *
 * Uso: node scripts/build-client.mjs <nombre-del-cliente>
 *
 * Lee clients/<nombre>/client.json, inyecta el clientId (y nombre) en el
 * build via variables VITE_* y genera dist/<nombre>/ listo para desplegar
 * de forma independiente (p. ej. en Dockploy).
 *
 * Se construye primero en dist/.build-<nombre> y solo si el build tiene éxito
 * se reemplaza dist/<nombre> (rmSync + renameSync), para no dejar artefactos
 * a medias ni pisar un dist/<cliente> válido con un build fallido.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, rmSync, renameSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Mismo patrón de validación que scripts/new-client.mjs (kebab-case).
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const clientName = process.argv[2]

if (!clientName) {
  console.error('Uso: node scripts/build-client.mjs <nombre-del-cliente>')
  process.exit(1)
}

if (!NAME_PATTERN.test(clientName)) {
  console.error(
    `Nombre inválido: "${clientName}". Usa kebab-case (minúsculas, guiones): ej. radio-fusion-austral`
  )
  process.exit(1)
}

const clientPath = resolve(root, 'clients', clientName, 'client.json')
let clientConfig
try {
  clientConfig = JSON.parse(readFileSync(clientPath, 'utf8'))
} catch (error) {
  console.error(
    `No se pudo leer clients/${clientName}/client.json: ${error.message}`
  )
  process.exit(1)
}

if (!clientConfig.clientId) {
  console.error(`clients/${clientName}/client.json debe incluir "clientId"`)
  process.exit(1)
}

const distDir = resolve(root, 'dist')
const tempOutDir = resolve(distDir, `.build-${clientName}`)
const outDir = resolve(distDir, clientName)

const publicDir = resolve(root, 'public')
const clientIconsDir = resolve(root, 'clients', clientName, 'icons')
const mergedPublicDir = resolve(root, 'node_modules', '.tmp', `public-${clientName}`)

const API_BASE = 'https://panelipstream.cl'
const BASIC_DATA_TIMEOUT_MS = 5000

/** Convierte una ruta relativa de la API en URL absoluta; deja intactas las absolutas. */
function toAbsoluteUrl(path) {
  if (!path) return undefined
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path
  return `${API_BASE}${path}`
}

/**
 * Metadatos Open Graph/Twitter del cliente. Si la API no responde, degrada al
 * nombre del client.json y omite los campos que no pueda resolver.
 */
async function fetchOgMeta(config, name) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), BASIC_DATA_TIMEOUT_MS)
  let basicData = null
  try {
    const res = await fetch(
      `${API_BASE}/api/public/${config.clientId}/basic-data`,
      { signal: controller.signal }
    )
    if (res.ok) basicData = await res.json()
  } catch {
    basicData = null
  } finally {
    clearTimeout(timer)
  }

  const title = basicData?.projectName || config.name || name
  const siteUrl = config.siteUrl || basicData?.websiteUrl || undefined
  const image =
    toAbsoluteUrl(basicData?.coverUrl) ||
    toAbsoluteUrl(basicData?.logoUrl) ||
    (siteUrl ? `${siteUrl.replace(/\/$/, '')}/icon-512.png` : undefined)

  return {
    title,
    description: basicData?.projectDescription || undefined,
    image,
    url: siteUrl,
    siteName: title
  }
}

const ogMeta = await fetchOgMeta(clientConfig, clientName)

console.log(
  `Building client "${clientName}" (clientId: ${clientConfig.clientId}) -> ${outDir}`
)
console.log(
  `Metadatos: title="${ogMeta.title}" image="${ogMeta.image ?? '(sin imagen)'}" url="${ogMeta.url ?? '(sin url)'}"`
)

// Verificación de tipos previa: un error de TypeScript debe detener el build
// de producción (el script `build` normal ya corre `tsc -b && vite build`).
const typecheck = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsc', '-b'],
  { cwd: root, stdio: 'inherit' }
)

if (typecheck.error || typecheck.status !== 0) {
  console.error(
    `\n✗ La verificación de tipos falló. No se construyó "${clientName}".`
  )
  process.exit(typecheck.status ?? 1)
}

// publicDir fusionado: copia de public/ + overlay de clients/<nombre>/icons/.
// Los archivos del cliente sobrescriben a los compartidos; lo que el cliente no
// defina (p. ej. offline.html) se hereda. El temporal vive fuera de dist/ para
// no generar artefactos ni avisos de Vite.
rmSync(mergedPublicDir, { recursive: true, force: true })
cpSync(publicDir, mergedPublicDir, { recursive: true })
if (existsSync(clientIconsDir)) {
  cpSync(clientIconsDir, mergedPublicDir, { recursive: true })
}

let result
try {
  result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', 'build', '--mode', clientName, '--outDir', tempOutDir],
    {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_CLIENT_ID: clientConfig.clientId,
        VITE_CLIENT_NAME: clientConfig.name || clientName,
        VITE_PUBLIC_DIR: mergedPublicDir,
        VITE_OG_JSON: JSON.stringify(ogMeta)
      }
    }
  )
} finally {
  rmSync(mergedPublicDir, { recursive: true, force: true })
}

if (result.error || result.status !== 0) {
  // Build fallido: limpiar el directorio temporal y salir con el status del build.
  rmSync(tempOutDir, { recursive: true, force: true })
  console.error(`\n✗ El build de "${clientName}" falló. No se modificó dist/${clientName}.`)
  process.exit(result.status ?? 1)
}

// Build correcto: reemplaza dist/<clientName> por el build recién generado.
rmSync(outDir, { recursive: true, force: true })
renameSync(tempOutDir, outDir)
console.log(`✓ Build completado: ${outDir.replace(root + '/', '')}/`)
