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
  masterTeacherName: string | null
  masterTeacherPhone: string | null
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
  usta_ogretici_ad: string | null
  usta_ogretici_telefon: string | null
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
  const filterType = searchParams.filter || 'tum'

  // Calculate offset for server-side pagination
  const skip = (page - 1) * perPage

  try {
    // Build where conditions for database-level filtering
    let whereConditions: any = {}
    
    // Apply search filter at database level
    if (search) {
      const query = search.toLowerCase().trim()
      whereConditions.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { contact: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
        { email: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
        { pin: { contains: query } },
        // Teacher search
        { teacher: { 
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { surname: { contains: query, mode: 'insensitive' } }
          ]
        }},
        // Student search
        { students: {
          some: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { surname: { contains: query, mode: 'insensitive' } },
              { number: { contains: query } }
            ]
          }
        }}
      ]
    }

    // For active companies filter, add student condition
    if (filterType === 'aktif') {
      const activeStudentCondition = {
        students: {
          some: {
            stajlar: {
              some: {
                status: 'ACTIVE',
                terminationDate: null
              }
            }
          }
        }
      }
      
      // Combine with search conditions
      if (whereConditions.OR) {
        whereConditions = {
          AND: [
            activeStudentCondition,
            { OR: whereConditions.OR }
          ]
        }
      } else {
        whereConditions = activeStudentCondition
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.companyProfile.count({
      where: whereConditions
    })

    // Get paginated companies with server-side pagination
    const allCompanies = await prisma.companyProfile.findMany({
      where: whereConditions,
      include: {
        teacher: {
          include: {
            alan: true
          }
        },
        students: {
          include: {
            stajlar: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      },
      skip: skip,
      take: perPage
    })

    // Transform data to match the expected format
    const transformedCompanies: TransformedCompany[] = allCompanies.map((company: any) => ({
      id: company.id,
      ad: company.name,
      adres: company.address,
      telefon: company.phone,
      email: company.email,
      yetkili_kisi: company.contact,
      pin: company.pin,
      ogretmen_id: company.teacherId,
      usta_ogretici_ad: company.masterTeacherName,
      usta_ogretici_telefon: company.masterTeacherPhone,
      ogretmenler: company.teacher ? {
        id: company.teacher.id,
        ad: company.teacher.name,
        soyad: company.teacher.surname,
        alanlar: company.teacher.alan ? {
          ad: company.teacher.alan.name
        } : null
      } : null,
      aktifOgrenciler: company.students
        .filter((student: any) =>
          student.stajlar.some((staj: any) =>
            staj.status === 'ACTIVE' && !staj.terminationDate
          )
        )
        .map((student: any) => ({
          id: student.id,
          ad: student.name,
          soyad: student.surname,
          no: student.number || '',
          sinif: student.className
        }))
    }))

    return {
      isletmeler: transformedCompanies,
      pagination: {
        page,
        perPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / perPage)
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