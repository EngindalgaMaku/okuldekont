import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Okul Dekont',
    short_name: 'Dekont',
    lang: 'tr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0ea5e9',
    description: 'Mesleki ve Teknik Anadolu Lisesi için koordinatörlük yönetim sistemi',
    icons: [
      // Mevcut görseller kullanılıyor; dilerseniz özel boyutlu ikonlar ekleyebiliriz: public/icons/icon-192.png, icon-512.png
      { src: '/images/logo.png', sizes: '192x192', type: 'image/png' },
      { src: '/images/logo.png', sizes: '512x512', type: 'image/png' }
    ]
  }
}
