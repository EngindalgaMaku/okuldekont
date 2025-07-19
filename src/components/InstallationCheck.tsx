'use client'

import { AlertTriangle } from 'lucide-react'

// InstallationCheck component geçici olarak devre dışı - Supabase to Prisma migration tamamlanana kadar
interface InstallationCheckProps {
  children: React.ReactNode
}

export default function InstallationCheck({ children }: InstallationCheckProps) {
  // Geçici olarak tüm sayfaları geçsin
  return <>{children}</>
}