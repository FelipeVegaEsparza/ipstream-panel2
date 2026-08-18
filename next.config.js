/** @type {import('next').NextConfig} */
const SRS_INTERNAL_URL = process.env.SRS_INTERNAL_URL || 'http://srs:8080'

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
    serverActions: {
      bodySizeLimit: '2mb',
      // Lista de hosts confiables cuando Next.js está detrás de un proxy
      // inverso (Caddy, Nginx, etc.). Sin esto, fallan los formularios
      // con "Failed to find Server Action" / "Missing origin header".
      allowedOrigins: [
        'localhost:3000',
        process.env.PANEL_PUBLIC_URL?.replace(/^https?:\/\//, '') || 'panelipstream.cl',
        process.env.PANEL_PUBLIC_URL || 'https://panelipstream.cl',
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
    ]
  },
}

module.exports = nextConfig