import { ArrowLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type PageParams = { id: string; sinifId: string }

// Sınıf detay sayfası geçici olarak devre dışı - Supabase to Prisma migration tamamlanana kadar
export default async function SinifDetayPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id: alanId, sinifId } = await params

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-600 mb-2">
          <Link href="/admin/alanlar" className="hover:text-indigo-600 flex items-center">
            Meslek Alanları
          </Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link href={`/admin/alanlar/${alanId}?tab=siniflar`} className="hover:text-indigo-600 flex items-center">
            Alan
          </Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="text-gray-900">Sınıf Detayı</span>
        </nav>

        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Sınıf Detayı</h1>

        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden p-6">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">🚧 Geçici Devre Dışı</h2>
            <p className="text-gray-600 mb-4">Sınıf detay sayfası şu anda Prisma migration nedeniyle devre dışıdır.</p>
            <p className="text-sm text-gray-500">Alan ID: {alanId} | Sınıf ID: {sinifId}</p>
            <div className="mt-6">
              <Link
                href={`/admin/alanlar/${alanId}?tab=siniflar`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Geri Dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}