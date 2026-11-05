import type { NextConfig } from 'next';

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
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
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
