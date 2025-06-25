/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint configuration for build
  eslint: {
    // Only run ESLint on specific directories during build
    dirs: ['src'],
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: false,
  },
  // TypeScript configuration
  typescript: {
    // Allow production builds to complete even with TypeScript errors (not recommended for production)
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    // Handle node modules that need to be processed by webpack
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Add specific handling for mammoth and other dependencies
    config.module.rules.push({
      test: /\.(docx|pptx)$/,
      use: 'raw-loader',
    });

    return config;
  },
  // External packages that should be processed on the server
  serverExternalPackages: [
    'mammoth',
    'pdf-parse',
    'pdf-lib',
    'raw-loader'
  ],
  // Experimental features
  experimental: {
    // Add any other experimental features here
  },
};

module.exports = nextConfig; 