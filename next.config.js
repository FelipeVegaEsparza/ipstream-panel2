/** @type {import('next').NextConfig} */
const SRS_INTERNAL_URL = process.env.SRS_INTERNAL_URL || 'http://srs:8080'

// Dominio público del panel. Se incluye de forma explícita junto con el
// dominio legacy porque `PANEL_PUBLIC_URL` no siempre está disponible en el
// build de Docker (las Server Actions se validan contra esta allowlist).
const PANEL_PUBLIC_URL = process.env.PANEL_PUBLIC_URL || 'https://panel.casterfly.com'
const PANEL_PUBLIC_HOST = PANEL_PUBLIC_URL.replace(/^https?:\/\//, '')

const nextConfig = {
  images: {
    domains: ['localhost', 'uploadthing.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Force redeploy: trigger menu page rebuild
  experimental: {
    serverComponentsExternalPackages: ['ssh2', '@node-rs/bcrypt'],
    serverActions: {
      bodySizeLimit: '2mb',
      // Lista de hosts confiables cuando Next.js está detrás de un proxy
      // inverso (Caddy, Nginx, etc.). Sin esto, fallan los formularios
      // con "Failed to find Server Action" / "Missing origin header".
      allowedOrigins: [
        'localhost:3000',
        PANEL_PUBLIC_HOST,
        PANEL_PUBLIC_URL,
        // Dominio legacy durante la transición (PWA y enlaces guardados).
        'panelipstream.cl',
        'https://panelipstream.cl',
      ],
    },
  },
  async rewrites() {
    return [
      // Proxy HLS de SRS a través del panel para evitar problemas de CORS
      // y no exponer SRS públicamente. /live/* → SRS /live/*
      {
        source: '/live/:path*',
        destination: `${SRS_INTERNAL_URL}/live/:path*`,
      },
      {
        source: '/dj/:path*',
        destination: `${SRS_INTERNAL_URL}/dj/:path*`,
      },
    ]
  },
}

module.exports = nextConfig