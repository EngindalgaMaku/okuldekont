import { cookies } from 'next/headers'
import Link from 'next/link'
import { User, Users, GraduationCap, Building2 } from 'lucide-react'
import AlanDetayHeader from '@/components/admin/alan-detay/AlanDetayHeader'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

import OgretmenlerTab from '@/components/admin/alan-detay/OgretmenlerTab'
import SiniflarTab from '@/components/admin/alan-detay/SiniflarTab'
import OgrencilerTab from '@/components/admin/alan-detay/OgrencilerTab'
import IsletmelerTab from '@/components/admin/alan-detay/IsletmelerTab'

// Tipler ortak bir dosyaya taşınabilir
interface Alan {
  id: string;
  ad: string;
  aciklama?: string;
  aktif: boolean;
}

// Sunucu tarafında veri çekme fonksiyonu
async function getAlanData(alanId: string, currentPage: number = 1) {
  const itemsPerPage = 10
  const skip = (currentPage - 1) * itemsPerPage

  try {
    // Alan bilgisini getir
    const alan = await prisma.alan.findUnique({
      where: { id: alanId }
    })

    if (!alan) {
      throw new Error('Alan bulunamadı')
    }

    // Öğretmenler ve onların staj bilgilerini getir
    const ogretmenlerData = await prisma.teacherProfile.findMany({
      where: { alanId: alanId },
      include: {
        stajlar: {
          select: {
            studentId: true,
            companyId: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Sınıfları getir
    const siniflarData = await prisma.class.findMany({
      where: { alanId: alanId },
      orderBy: { name: 'asc' }
    })

    // Öğrencileri sayfalı olarak getir
    const ogrencilerData = await prisma.student.findMany({
      where: { alanId: alanId },
      select: {
        id: true,
        name: true,
        surname: true,
        number: true,
        className: true
      },
      orderBy: { name: 'asc' },
      skip: skip,
      take: itemsPerPage
    })

    // Toplam öğrenci sayısını getir
    const totalOgrencilerCount = await prisma.student.count({
      where: { alanId: alanId }
    })

    // Bu alan için staj yapan öğrencilerin çalıştığı işletmeleri getir
    const isletmelerData = await prisma.companyProfile.findMany({
      where: {
        stajlar: {
          some: {
            student: {
              alanId: alanId
            }
          }
        }
      },
      include: {
        stajlar: {
          where: {
            student: {
              alanId: alanId
            }
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                surname: true
              }
            }
          }
        }
      }
    })

    // Öğretmen verilerini dönüştür
    const ogretmenler = ogretmenlerData.map((ogretmen: any) => {
      const stajlar = ogretmen.stajlar || []
      const ogrenciSayisi = new Set(stajlar.map((s: any) => s.studentId)).size
      const isletmeSayisi = new Set(stajlar.map((s: any) => s.companyId)).size
      return {
        ...ogretmen,
        ad: ogretmen.name,
        soyad: ogretmen.surname,
        ogrenci_sayisi: ogrenciSayisi,
        isletme_sayisi: isletmeSayisi,
      }
    })

    const totalOgrenciler = totalOgrencilerCount || 0
    const totalPages = Math.ceil(totalOgrenciler / itemsPerPage)

    // Her sınıf için öğrenci sayısını hesapla
    const studentCounts = ogrencilerData.reduce((acc: any, ogrenci: any) => {
      acc[ogrenci.className] = (acc[ogrenci.className] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sınıfları dönüştür ve öğrenci sayılarını ekle
    const siniflarMap = new Map();
    siniflarData.forEach((sinif: any) => {
      if (!siniflarMap.has(sinif.name)) {
        siniflarMap.set(sinif.name, {
          ...sinif,
          ad: sinif.name,
          ogrenci_sayisi: studentCounts[sinif.name] || 0
        });
      }
    });
    const uniqueSiniflar = Array.from(siniflarMap.values());

    // Öğrenci verilerini dönüştür
    const transformedOgrenciler = ogrencilerData.map((ogrenci: any) => ({
      ...ogrenci,
      ad: ogrenci.name,
      soyad: ogrenci.surname,
      no: ogrenci.number,
      sinif: ogrenci.className
    }));

    // İşletme verilerini dönüştür
    const transformedIsletmeler = isletmelerData.map((isletme: any) => ({
      ...isletme,
      ad: isletme.name,
      yetkili: isletme.contact,
      telefon: isletme.phone,
      email: isletme.email,
      adres: isletme.address
    }));

    return {
      alan: {
        id: alan.id,
        ad: alan.name,
        aciklama: alan.description || undefined,
        aktif: alan.active
      } as Alan,
      ogretmenler: ogretmenler,
      siniflar: uniqueSiniflar,
      ogrenciler: transformedOgrenciler || [],
      isletmeListesi: transformedIsletmeler || [],
      totalOgrenciler,
      totalPages,
      currentPage
    }
  } catch (error) {
    console.error('Alan verileri yüklenirken hata:', error)
    throw new Error('Alan verileri yüklenirken bir hata oluştu.')
  }
}

export default async function AlanDetayPageSSR({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ tab: string, page?: string }> }) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const alanId = resolvedParams.id
  const activeTab = resolvedSearchParams.tab || 'ogretmenler'
  const currentPage = Number(resolvedSearchParams.page) || 1
  
  const { alan, ogretmenler, siniflar, ogrenciler, isletmeListesi, totalOgrenciler, totalPages } = await getAlanData(alanId, currentPage)

  if (!alan) {
    return <div>Alan bulunamadı.</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        <AlanDetayHeader alan={alan} />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <Link href={`/admin/alanlar/${alanId}?tab=ogretmenler`} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'ogretmenler' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <Users className="h-5 w-5" />
                Öğretmenler ({ogretmenler.length})
              </Link>
              <Link href={`/admin/alanlar/${alanId}?tab=siniflar`} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'siniflar' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <GraduationCap className="h-5 w-5" />
                Sınıflar ({siniflar.length})
              </Link>
              <Link href={`/admin/alanlar/${alanId}?tab=ogrenciler`} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'ogrenciler' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <User className="h-5 w-5" />
                Öğrenciler ({totalOgrenciler})
              </Link>
              <Link href={`/admin/alanlar/${alanId}?tab=isletmeler`} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'isletmeler' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <Building2 className="h-5 w-5" />
                İşletmeler ({isletmeListesi.length})
              </Link>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'ogretmenler' && <OgretmenlerTab ogretmenler={ogretmenler} />}
            {activeTab === 'siniflar' && <SiniflarTab initialSiniflar={siniflar} alanId={alanId} />}
            {activeTab === 'ogrenciler' && <OgrencilerTab initialOgrenciler={ogrenciler} initialTotalOgrenciler={totalOgrenciler} initialTotalPages={totalPages} initialCurrentPage={currentPage} siniflar={siniflar} alanId={alanId} />}
            {activeTab === 'isletmeler' && <IsletmelerTab alanId={alanId} initialIsletmeListesi={isletmeListesi} />}
          </div>
        </div>
      </div>
    </div>
  )
}