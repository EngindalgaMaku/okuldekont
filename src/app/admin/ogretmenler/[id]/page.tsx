import Link from 'next/link'
import { ArrowLeft, Briefcase } from 'lucide-react'
import OgretmenDetayClient from '@/components/admin/ogretmen-detay/OgretmenDetayClient'
import { fetchOgretmenDetayOptimized } from '@/lib/optimized-queries'

export const dynamic = 'force-dynamic'

async function getOgretmenData(ogretmenId: string) {
  try {
    const data = await fetchOgretmenDetayOptimized(ogretmenId)
    return {
      ogretmen: {
        id: data.id,
        ad: data.ad,
        soyad: data.soyad,
        email: data.email,
        telefon: data.telefon,
        alan: data.alanlar
      },
      stajlar: data.stajlar || [],
      program: data.koordinatorluk_programi || []
    }
  } catch (error) {
    console.error('Error fetching teacher data:', error)
    throw error
  }
}

export default async function OgretmenDetaySayfasi({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ tab?: string, page?: string }> }) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const ogretmenId = resolvedParams.id
  
  try {
    const { ogretmen, stajlar, program } = await getOgretmenData(ogretmenId)

    if (!ogretmen) {
      return <div className="text-center py-12">Öğretmen bulunamadı.</div>
    }

    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-8xl mx-auto px-2 sm:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="w-full">
              <Link href="/admin/ogretmenler" className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Öğretmenler
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">{ogretmen.ad} {ogretmen.soyad}</h1>
              <p className="text-gray-600 flex items-center mt-1">
                <Briefcase className="h-4 w-4 mr-2" />
                {(ogretmen.alan as any)?.ad || 'Alan belirtilmemiş'}
              </p>
            </div>
          </div>
          
          <OgretmenDetayClient
            ogretmen={ogretmen}
            initialStajlar={stajlar.map(s => ({...s, ogrenciler: Array.isArray(s.ogrenciler) ? s.ogrenciler[0] : s.ogrenciler, isletmeler: Array.isArray(s.isletmeler) ? s.isletmeler[0] : s.isletmeler }))}
            initialProgram={program}
            searchParams={resolvedSearchParams}
          />
        </div>
      </div>
    )
  } catch (error: any) {
    return <div className="text-center py-12 text-red-600">Hata: {error.message}</div>
  }
}