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