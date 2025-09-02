/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Tesseract.js için gerekli konfigürasyon
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Tesseract.js worker dosyalarını kopyala
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Worker dosyaları için özel yönetim
    config.output.assetModuleFilename = 'static/chunks/[hash][ext]';
    
    return config;
  },
  
  // Tesseract.js static dosyaları için
  async rewrites() {
    return [
      {
        source: '/worker-script/:path*',
        destination: '/node_modules/tesseract.js/dist/:path*'
      }
    ];
  },

  // Static dosya optimizasyonu
  images: {
    domains: [],
    unoptimized: true
  }
}

// PWA configuration
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [
    /middleware-manifest\.json$/, 
    /_middleware\.js$/,
    /\/_middleware\.ts$/
  ],
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
  publicExcludes: ['!noprecache/**/*'],
  dynamicStartUrl: false,
  reloadOnOnline: true,
  sourcemap: false
})

module.exports = withPWA(nextConfig)