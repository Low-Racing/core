/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable server components
  experimental: {
    serverActions: true,
    // Add any other experimental features you need
  },
  // Increase the maximum file size for API routes (if needed)
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  // Add any necessary webpack configurations
  webpack: (config, { isServer }) => {
    // Important: return the modified config
    return config;
  },
  // Add environment variables that should be exposed to the browser
  env: {
    // Add any environment variables that should be available on the client side
  },
  // Add any necessary image domains
  images: {
    domains: ['lh3.googleusercontent.com', 'drive.google.com'],
  },
  // Add any necessary redirects or rewrites
  async redirects() {
    return [];
  },
  async rewrites() {
    return [];
  },
  // Add any necessary headers
  async headers() {
    return [];
  },
  // Add any necessary output configuration
  output: 'standalone',
};

module.exports = nextConfig;
