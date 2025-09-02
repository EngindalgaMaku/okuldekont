import './globals.css'
import type { Metadata } from 'next'
import { EgitimYiliProvider } from '@/lib/context/EgitimYiliContext'
import { ToastProvider } from '@/components/ui/Toast'
import { SessionProvider } from '@/components/providers/SessionProvider'
import MobileBottomNav from '@/components/ui/MobileBottomNav'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Koordinatörlük Yönetim Sistemi',
  description: 'Mesleki ve Teknik Anadolu Lisesi için koordinatörlük yönetim sistemi',
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="h-full">
      <head>
        {/* iOS PWA meta tags */}
        <link rel="apple-touch-icon" href="/images/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Okul Dekont" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className="min-h-[100dvh] bg-slate-50">
        {/* Service Worker Registration */}
        <script src="/registerSW.js" />
        <SessionProvider>
          <EgitimYiliProvider>
            <ToastProvider>
              <div className="min-h-[100dvh] pb-16 md:pb-0">
                {children}
              </div>
              <Suspense fallback={null}>
                <MobileBottomNav />
              </Suspense>
            </ToastProvider>
          </EgitimYiliProvider>
        </SessionProvider>
      </body>
    </html>
  )
}