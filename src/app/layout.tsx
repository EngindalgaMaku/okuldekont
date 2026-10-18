import './globals.css'
import DemoMode from '@/components/DemoMode'
import type { Metadata } from 'next'
import { EgitimYiliProvider } from '@/lib/context/EgitimYiliContext'
import { ToastProvider } from '@/components/ui/Toast'
import { SessionProvider } from '@/components/providers/SessionProvider'
import MobileBottomNav from '@/components/ui/MobileBottomNav'
import { Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import FilePreviewOverlay from '@/components/ui/FilePreviewOverlay'

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
    <html lang="tr" className="h-full" suppressHydrationWarning>
      <head>
        {/* PWA meta tags */}
        <link rel="apple-touch-icon" href="/images/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Okul Dekont" />
        <meta name="theme-color" content="#0ea5e9" />
        {/* Android uygulaması içinde açıldıysa (veya ?app=android ile) uygulama görünümünü etkinleştir */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if(/KPanelAndroid/.test(navigator.userAgent)||/[?&]app=android/.test(location.search)){document.documentElement.setAttribute('data-app','android')}",
          }}
        />
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
              <FilePreviewOverlay />
              <DemoMode />
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 4000,
                  error: { duration: 6000 },
                  style: { whiteSpace: 'pre-line', maxWidth: 480 },
                }}
              />
            </ToastProvider>
          </EgitimYiliProvider>
        </SessionProvider>
      </body>
    </html>
  )
}