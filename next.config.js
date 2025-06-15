/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Force unique build ID to avoid chunk caching issues
    config.output.uniqueName = Date.now().toString();
    return config;
  },
  // Force a new build ID each time
  generateBuildId: async () => {
    return Date.now().toString();
  },
};

module.exports = nextConfig; 