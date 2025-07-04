/** @type {import('next').NextConfig} */
const nextConfig = {
  // Güvenlik için harici domainleri belirt
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig 