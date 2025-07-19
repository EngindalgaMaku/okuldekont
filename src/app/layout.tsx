import './globals.css'
import type { Metadata } from 'next'
import { EgitimYiliProvider } from '@/lib/context/EgitimYiliContext'
import { ToastProvider } from '@/components/ui/Toast'
import { SessionProvider } from '@/components/providers/SessionProvider'

export const metadata: Metadata = {
  title: 'Koordinatörlük Yönetim Sistemi',
  description: 'Mesleki ve Teknik Anadolu Lisesi için koordinatörlük yönetim sistemi',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="h-full">
      <body className="min-h-full">
        <SessionProvider>
          <EgitimYiliProvider>
            <ToastProvider>
              <div className="min-h-screen">
                {children}
              </div>
            </ToastProvider>
          </EgitimYiliProvider>
        </SessionProvider>
      </body>
    </html>
  )
}