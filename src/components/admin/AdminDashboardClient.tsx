'use client'

import { AlertTriangle } from 'lucide-react'

// AdminDashboardClient component geçici olarak devre dışı - Supabase to Prisma migration tamamlanana kadar
interface Stats {
  totalDekontlar: number;
  bekleyenDekontlar: number;
  onaylananDekontlar: number;
  rededilenDekontlar: number;
  totalIsletmeler: number;
  totalOgretmenler: number;
  totalOgrenciler: number;
}

interface RecentDekont {
  id: number;
  created_at: string;
  onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi';
  stajlar: {
    ogrenciler: { ad: string; soyad: string } | null;
    isletmeler: { ad: string } | null;
  } | null;
}

interface AdminDashboardClientProps {
  initialStats: Stats;
  initialSchoolName: string;
  initialQueryTime: number;
  initialRecentDekonts: RecentDekont[];
}

export default function AdminDashboardClient({ initialStats, initialSchoolName, initialQueryTime, initialRecentDekonts }: AdminDashboardClientProps) {
  return (
    <div className="min-h-[600px] bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center rounded-lg">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 border-2 border-red-200">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">🚧 Geçici Devre Dışı</h2>
          <p className="text-gray-600 mb-4">Admin dashboard client bileşeni şu anda Prisma migration nedeniyle devre dışıdır.</p>
          <p className="text-sm text-gray-500">Okul: {initialSchoolName}</p>
        </div>
      </div>
    </div>
  )
}