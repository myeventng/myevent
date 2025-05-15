import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcryptjs'],
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
