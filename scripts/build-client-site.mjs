#!/usr/bin/env node
// =====================================================
// build-client-site.mjs — construye el bundle único de la PWA y lo publica
// en el directorio que sirve el panel (CLIENT_SITE_DIR, default public/client-site).
// =====================================================
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pwaDir = resolve(root, 'pwa')
const distDir = resolve(pwaDir, 'dist')
const outDir = process.env.CLIENT_SITE_DIR || resolve(root, 'public', 'client-site')

if (!existsSync(resolve(pwaDir, 'package.json'))) {
  console.error('No se encontró pwa/package.json. ¿Está copiada la PWA?')
  process.exit(1)
}

console.log('▶ Construyendo la PWA…')
const build = spawnSync('npm', ['run', 'build'], { cwd: pwaDir, stdio: 'inherit' })
if (build.error || build.status !== 0) {
  console.error('✗ El build de la PWA falló.')
  process.exit(build.status ?? 1)
}

if (!existsSync(distDir)) {
  console.error(`✗ No se generó ${distDir}`)
  process.exit(1)
}

rmSync(outDir, { recursive: true, force: true })
cpSync(distDir, outDir, { recursive: true })
console.log(`✓ Bundle único publicado en ${outDir}`)
