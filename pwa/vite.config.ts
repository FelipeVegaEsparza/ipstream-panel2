/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { injectOgMeta } from './src/core/seo/ogMeta.ts'
import { injectSplash } from './src/core/seo/splash.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv lee .env / .env.<mode> (Vite no expone VITE_* en process.env durante
  // la evaluación de la config). build-client.mjs además inyecta las variables
  // en el entorno del proceso, que tienen prioridad.
  const env = loadEnv(mode, process.cwd(), '')
  const clientName =
    process.env.VITE_CLIENT_NAME || env.VITE_CLIENT_NAME || 'IPStream PWA'

  // Metadatos Open Graph/Twitter. build-client.mjs los arma con los datos de la
  // API pública y los pasa serializados en VITE_OG_JSON. En dev solo hay nombre.
  function readOgMeta(): Record<string, string | undefined> {
    const raw = process.env.VITE_OG_JSON
    if (!raw) return {}
    try {
      return JSON.parse(raw) as Record<string, string | undefined>
    } catch {
      return {}
    }
  }

  return {
  base: '/',
  // Permite que build-client.mjs pase un publicDir fusionado (public/ + los
  // iconos propios del cliente). En dev y en el build normal se usa public/.
  publicDir: process.env.VITE_PUBLIC_DIR || 'public',
  build: {
    // hls.js vive en su propio chunk bajo demanda (~574 kB min); el resto de la
    // app queda muy por debajo del límite por defecto.
    chunkSizeWarningLimit: 600
  },
  plugins: [
    react(),
    {
      name: 'ipstream-og-meta',
      transformIndexHtml(html: string) {
        const og = readOgMeta()
        return injectOgMeta(html, {
          title: og.title || clientName,
          description: og.description,
          image: og.image,
          url: og.url,
          siteName: og.siteName
        })
      }
    },
    {
      name: 'ipstream-splash',
      transformIndexHtml(html: string) {
        return injectSplash(html, {
          image: process.env.VITE_SPLASH_IMAGE,
          name: process.env.VITE_CLIENT_NAME || env.VITE_CLIENT_NAME || clientName
        })
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: [
        'favicon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'apple-touch-icon.png'
      ],
      manifest: {
        name: clientName,
        short_name: clientName.length > 12 ? `${clientName.slice(0, 12)}…` : clientName,
        description: `App PWA de ${clientName}`,
        lang: 'es',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true
  }
  }
})
