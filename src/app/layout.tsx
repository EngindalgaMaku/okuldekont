import './globals.css'
import type { Metadata } from 'next'
import { EgitimYiliProvider } from '@/lib/context/EgitimYiliContext'
import { ToastProvider } from '@/components/ui/Toast'
import { InstallationCheck } from '@/components/InstallationCheck'

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
        <EgitimYiliProvider>
          <ToastProvider>
            <InstallationCheck>
              <div className="min-h-screen">
                {children}
              </div>
            </InstallationCheck>
          </ToastProvider>
        </EgitimYiliProvider>
      </body>
    </html>
  )
} 