import AlanlarClient from '@/components/admin/AlanlarClient'
import { GraduationCap } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface Alan {
  id: string
  ad: string
  aciklama?: string
  aktif: boolean
  ogretmen_sayisi: number
  ogrenci_sayisi: number
  isletme_sayisi: number
}

async function getAlanlar(): Promise<Alan[]> {
  try {
    // Get all fields with statistics directly from Prisma
    const fields = await prisma.alan.findMany({
      include: {
        _count: {
          select: {
            teachers: true,
            students: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Get companies count separately
    const companiesCount = await prisma.companyProfile.count()

    // Transform data to match expected interface
    const transformedFields = fields.map(field => ({
      id: field.id,
      ad: field.name,
      aciklama: field.description || undefined,
      aktif: field.active,
      ogretmen_sayisi: field._count.teachers,
      ogrenci_sayisi: field._count.students,
      isletme_sayisi: companiesCount // This is a rough approximation
    }))

    return transformedFields
  } catch (error) {
    console.error('Alanlar yüklenirken hata:', error)
    return []
  }
}

export default async function AlanlarPage() {
  const alanlar = await getAlanlar()

  if (alanlar.length === 0) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Henüz alan yok</h3>
        <p className="mt-2 text-gray-500">Başlamak için yeni bir meslek alanı ekleyin.</p>
        {/* Yeni alan ekleme butonu artık Client Component içinde */}
        <AlanlarClient initialAlanlar={[]} />
      </div>
    )
  }

  return <AlanlarClient initialAlanlar={alanlar} />
}