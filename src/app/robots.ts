import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // BEGIN Cloudflare Managed Content (blocked bots)
      { userAgent: 'Amazonbot', disallow: '/' },
      { userAgent: 'Applebot-Extended', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'meta-externalagent', disallow: '/' },
      // END Cloudflare Managed Content

      // Default agents
      {
        userAgent: '*',
        allow: [ '/', '/_next/', '/static/' ],
        disallow: [ '/api/', '/admin/', '/console/', '/login', '/register' ],
      },
    ],
    host: 'https://pylearn.net',
    sitemap: 'https://pylearn.net/sitemap.xml',
  }
}
