'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  ArrowRight
} from 'lucide-react'

export default function RaporlarPage() {
  const router = useRouter()

  useEffect(() => {
    // Otomatik olarak işlemler sayfasına yönlendir
    router.push('/admin/araclar/raporlar/islemler')
  }, [router])

  return (
    <div className="space-y-6">
      {/* Loading state while redirecting */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl">
            <FileText className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Raporlara Yönlendiriliyor...</h1>
            <p className="text-gray-600 flex items-center gap-2 justify-center mt-2">
              İşlem raporları sayfasına yönlendiriliyorsunuz
              <ArrowRight className="w-4 h-4" />
            </p>
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    </div>
  )
}