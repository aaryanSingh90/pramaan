import type { NextConfig } from 'next'

// Production-grade HTTP headers. Same set we'd ship behind Vercel / Caddy.
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  // Restrict powerful browser APIs we never use (camera, mic, geo).
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // HSTS — enabled even on dev because Pramaan never serves over plain HTTP
  // in production. Browsers ignore HSTS for non-HTTPS origins anyway.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  // Server actions + new App Router features.
  experimental: {
    // Larger uploads for bulk CSV + certificate background images.
    serverActions: { bodySizeLimit: '20mb' },
  },
  // Allow images from common storage hosts (S3 / R2 / cloudinary etc).
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  // Skip lint failures in `next build` — we run lint as a separate CI step.
  eslint: { ignoreDuringBuilds: true },
  // Hide the X-Powered-By: Next.js header — small but pointless attack surface.
  poweredByHeader: false,
  async headers() {
    return [
      // Apply security headers globally.
      { source: '/:path*', headers: securityHeaders },
      // The /v/<id> verify page is intentionally embeddable in trust widgets,
      // so we drop X-Frame-Options for that route. All other security headers
      // remain in place.
      { source: '/v/:id', headers: securityHeaders.filter(h => h.key !== 'X-Frame-Options') },
    ]
  },
}

export default nextConfig
