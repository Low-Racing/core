/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Configurações experimentais
  experimental: {
    serverActions: true,
    optimizeCss: true,
  },

  // Configuração de tamanho máximo para rotas de API
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },

  // Configuração do Webpack
  webpack: (config, { isServer }) => {
    // Adiciona suporte para arquivos de mídia
    config.module.rules.push({
      test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
      type: 'asset/resource',
    });

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
