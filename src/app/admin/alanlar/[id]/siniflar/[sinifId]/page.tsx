import { ArrowLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import OgrenciTablosu from '@/components/ui/OgrenciTablosu'

type PageParams = { id: string; sinifId: string }

export default async function SinifDetayPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id: alanId, sinifId } = await params

  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore } as any)

  try {
    const { data: sinif, error: sinifError } = await supabase
      .from('siniflar')
      .select()
      .eq('id', sinifId)
      .eq('alan_id', alanId)
      .single()

    if (sinifError || !sinif) {
      console.error('Sinif sorgu hatası:', sinifError)
      throw new Error(sinifError?.message || 'Sınıf bulunamadı')
    }

    const { data: ogrenciler, error: ogrenciError } = await supabase
      .from('ogrenciler')
      .select(
        `
        *,
        isletme:isletme_id (
          id,
          ad
        )
      `
      )
      .eq('sinif', sinif.ad)
      .eq('alan_id', alanId)
      .order('ad')

    if (ogrenciError) {
      console.error('Öğrenci sorgu hatası:', ogrenciError)
      throw ogrenciError
    }

    // Alan adını al
    const { data: alan, error: alanError } = await supabase
      .from('alanlar')
      .select('ad')
      .eq('id', alanId)
      .single()

    if (alanError) {
      console.error('Alan sorgu hatası:', alanError)
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm text-gray-600 mb-2">
            <Link href="/admin/alanlar" className="hover:text-indigo-600 flex items-center">
              Meslek Alanları
            </Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <Link href={`/admin/alanlar/${alanId}?tab=siniflar`} className="hover:text-indigo-600 flex items-center">
              {alan?.ad || 'Alan'}
            </Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="text-gray-900">{sinif.ad}</span>
          </nav>

          <h1 className="text-2xl font-semibold text-gray-900 mb-1">{alan?.ad}</h1>
          <h2 className="text-lg font-medium text-gray-700 mb-4">{sinif.ad}</h2>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
            <OgrenciTablosu ogrenciler={ogrenciler || []} />
          </div>
        </div>
      </div>
    )
  } catch (error: any) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href={`/admin/alanlar/${alanId}?tab=siniflar`}
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors duration-200"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">Hata</h1>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
            <p className="text-gray-600">
              {error instanceof Error
                ? error.message
                : 'Veri yüklenirken bir hata oluştu'}
            </p>
          </div>
        </div>
      </div>
    )
  }
} 