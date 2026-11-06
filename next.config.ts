import type { NextConfig } from 'next';

function r2ImagePatterns() {
  try {
    const host = new URL(process.env.R2_PUBLIC_BASE_URL ?? '').hostname;
    return host ? [{ protocol: 'https' as const, hostname: host, pathname: '/**' }] : [];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  turbopack: {},
  // pdfkit reads its font metric files from disk and bwip-js ships native-ish assets: keep both
  // un-bundled and make sure the files are traced into the serverless functions on Vercel.
  serverExternalPackages: ['bcryptjs', 'pdfkit', 'bwip-js'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/pdfkit/js/data/**/*', './public/logo-black.png'],
    '/dashboard/**/*': ['./node_modules/pdfkit/js/data/**/*', './public/logo-black.png'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ufs.sh',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // Cloudflare R2 public bucket host (read at build time from R2_PUBLIC_BASE_URL).
      ...r2ImagePatterns(),
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Replace password hashing libs with empty modules on the client-side
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        bcryptjs: false,
      };
    }

    return config;
  },
};

export default nextConfig;
