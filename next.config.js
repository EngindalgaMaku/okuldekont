/** @type {import('next').NextConfig} */
const nextConfig = {
  // Completely disable dev features that use socket.io
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Disable all watching and polling
      config.watchOptions = {
        poll: false,
        ignored: /node_modules/,
        aggregateTimeout: 300,
      }
      
      // Disable HMR completely
      config.plugins = config.plugins.filter(plugin => {
        return !(plugin.constructor.name === 'HotModuleReplacementPlugin')
      })
    }
    
    return config
  },
  
  // Disable all development features
  experimental: {
    webpackBuildWorker: false,
  },
  
  // Override dev server settings
  ...(process.env.NODE_ENV === 'development' && {
    // Force production-like behavior
    productionBrowserSourceMaps: false,
    optimizeFonts: false,
  }),
}

module.exports = nextConfig