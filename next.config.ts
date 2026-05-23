import type { NextConfig } from 'next'

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
}

export default nextConfig
