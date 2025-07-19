import { Suspense } from 'react'
import { Building, Search, Filter, Plus, Building2, User, MapPin, Phone, Mail, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckSquare, Square } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import IsletmelerClient from './IsletmelerClient'
import IsletmeRow from './IsletmeRow'

interface SearchParams {
  page?: string
  search?: string
  filter?: string
  per_page?: string
}

interface Props {
  searchParams: SearchParams
}

type CompanyWithIncludes = {
  id: string
  name: string
  contact: string
  phone: string | null
  email: string | null
  address: string | null
  pin: string
  teacherId: string | null
  teacher: {
    id: string
    name: string
    surname: string
    alan: {
      name: string
    } | null
  } | null
  students: {
    id: string
    name: string
    surname: string
    className: string
    number: string | null
    stajlar: {
      status: string
      terminationDate: Date | null
    }[]
  }[]
}

interface TransformedCompany {
  id: string
  ad: string
  adres: string | null
  telefon: string | null
  email: string | null
  yetkili_kisi: string
  pin: string
  ogretmen_id: string | null
  ogretmenler: {
    id: string
    ad: string
    soyad: string
    alanlar: {
      ad: string
    } | null
  } | null
  aktifOgrenciler: {
    id: string
    ad: string
    soyad: string
    no: string
    sinif: string
  }[]
}

async function getIsletmelerDataPrisma(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1')
  const perPage = parseInt(searchParams.per_page || '10')
  const search = searchParams.search || ''
  const filterType = searchParams.filter || 'aktif'

  // Calculate offset
  const from = (page - 1) * perPage

  try {
    // Get all companies with their teachers and fields
    const allCompanies = await prisma.companyProfile.findMany({
      include: {
        teacher: {
          include: {
            alan: true
          }
        },
        students: {
          where: {
            stajlar: {
              some: {
                status: 'ACTIVE',
                terminationDate: null
              }
            }
          },
          include: {
            stajlar: {
              where: {
                status: 'ACTIVE',
                terminationDate: null
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform data to match the expected format
    const transformedCompanies: TransformedCompany[] = allCompanies.map((company: CompanyWithIncludes) => ({
      id: company.id,
      ad: company.name,
      adres: company.address,
      telefon: company.phone,
      email: company.email,
      yetkili_kisi: company.contact,
      pin: company.pin,
      ogretmen_id: company.teacherId,
      ogretmenler: company.teacher ? {
        id: company.teacher.id,
        ad: company.teacher.name,
        soyad: company.teacher.surname,
        alanlar: company.teacher.alan ? {
          ad: company.teacher.alan.name
        } : null
      } : null,
      aktifOgrenciler: company.students.map((student: CompanyWithIncludes['students'][0]) => ({
        id: student.id,
        ad: student.name,
        soyad: student.surname,
        no: student.number || '',
        sinif: student.className
      }))
    }))

    // Apply aktif filter
    let filteredCompanies = transformedCompanies
    if (filterType === 'aktif') {
      filteredCompanies = transformedCompanies.filter((company: TransformedCompany) =>
        company.aktifOgrenciler && company.aktifOgrenciler.length > 0
      )
    }

    // Apply search filter
    if (search) {
      const query = search.toLowerCase().trim()
      filteredCompanies = filteredCompanies.filter((company: TransformedCompany) => {
        // Basic company fields search
        const basicSearch =
          company.ad.toLowerCase().includes(query) ||
          company.adres?.toLowerCase().includes(query) ||
          company.telefon?.includes(query) ||
          company.email?.toLowerCase().includes(query) ||
          company.yetkili_kisi?.toLowerCase().includes(query) ||
          company.pin?.includes(query)

        // Teacher search
        const teacherSearch = company.ogretmenler && (
          company.ogretmenler.ad?.toLowerCase().includes(query) ||
          company.ogretmenler.soyad?.toLowerCase().includes(query)
        )

        // Active students search
        const studentSearch = company.aktifOgrenciler?.some((student: TransformedCompany['aktifOgrenciler'][0]) =>
          student.ad.toLowerCase().includes(query) ||
          student.soyad.toLowerCase().includes(query) ||
          student.no.includes(query)
        )

        return basicSearch || teacherSearch || studentSearch
      })
    }

    // Apply pagination
    const totalFiltered = filteredCompanies.length
    const paginatedCompanies = filteredCompanies.slice(from, from + perPage)

    return {
      isletmeler: paginatedCompanies,
      pagination: {
        page,
        perPage,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / perPage)
      }
    }
  } catch (error) {
    console.error('Error fetching companies from Prisma:', error)
    throw new Error('İşletmeler yüklenirken bir hata oluştu')
  }
}

export default async function IsletmelerServerPrisma({ searchParams }: Props) {
  const { isletmeler, pagination } = await getIsletmelerDataPrisma(searchParams)

  return (
    <IsletmelerClient
      isletmeler={isletmeler.map((i: TransformedCompany) => ({
        id: i.id,
        ad: i.ad,
        yetkili_kisi: i.yetkili_kisi,
        telefon: i.telefon || undefined,
        email: i.email || undefined
      }))}
      fullIsletmeler={isletmeler}
      searchParams={searchParams}
      pagination={pagination}
    />
  )
}