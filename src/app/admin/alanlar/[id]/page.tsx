import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import AlanDetayClient from '@/components/admin/alan-detay/AlanDetayClient'

export const dynamic = 'force-dynamic'

// Sadece temel alan bilgilerini ve sayıları getir
async function getAlanBasicData(alanId: string) {
  try {
    // Alan bilgisini getir
    const alan = await prisma.alan.findUnique({
      where: { id: alanId }
    })

    if (!alan) {
      throw new Error('Alan bulunamadı')
    }

    // Basit sayıları getir (optimize edilmiş query'ler)
    const [ogretmenCount, sinifCount, ogrenciCount] = await Promise.all([
      prisma.teacherProfile.count({
        where: { alanId: alanId }
      }),
      prisma.class.count({
        where: { alanId: alanId }
      }),
      prisma.student.count({
        where: { alanId: alanId }
      })
    ])

    // İşletme sayısı (bu alan için staj yapan öğrencilerin çalıştığı işletmeler)
    const isletmeCount = await prisma.companyProfile.count({
      where: {
        stajlar: {
          some: {
            student: {
              alanId: alanId
            }
          }
        }
      }
    })

    return {
      alan: {
        id: alan.id,
        ad: alan.name,
        aciklama: alan.description || undefined,
        aktif: alan.active
      },
      counts: {
        ogretmenler: ogretmenCount,
        siniflar: sinifCount,
        ogrenciler: ogrenciCount,
        isletmeler: isletmeCount
      }
    }
  } catch (error) {
    console.error('Alan verileri yüklenirken hata:', error)
    throw new Error('Alan verileri yüklenirken bir hata oluştu.')
  }
}

export default async function AlanDetayPageSSR({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>, 
  searchParams: Promise<{ tab?: string }> 
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const alanId = resolvedParams.id
  const activeTab = resolvedSearchParams.tab || 'ogretmenler'
  
  const { alan, counts } = await getAlanBasicData(alanId)

  if (!alan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Alan Bulunamadı</h2>
          <p className="text-gray-600">Aradığınız alan mevcut değil veya silinmiş olabilir.</p>
        </div>
      </div>
    )
  }

  return (
    <AlanDetayClient 
      alan={alan} 
      counts={counts} 
      initialActiveTab={activeTab}
      alanId={alanId}
    />
  )
}