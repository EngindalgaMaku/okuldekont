import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'

export async function GET(request: Request) {
  // KRİTİK: Şirket verileri - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '10')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || ''

    // Calculate skip for pagination
    const skip = (page - 1) * perPage

    // Build where condition
    let whereCondition: any = {}
    
    if (search) {
      whereCondition.OR = [
        { name: { contains: search } },
        { contact: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } }
      ]
    }

    if (filter === 'active') {
      whereCondition.students = {
        some: {}
      }
    } else if (filter === 'empty') {
      whereCondition.students = {
        none: {}
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.companyProfile.count({
      where: whereCondition
    })

    // Get companies with pagination (include internship coordinators)
    const companies = await prisma.companyProfile.findMany({
      where: whereCondition,
      include: {
        teacher: true,
        user: true,
        _count: {
          select: {
            students: true
          }
        },
        stajlar: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            teacherId: true,
            teacher: {
              select: {
                id: true,
                name: true,
                surname: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      },
      skip,
      take: perPage
    })

    // Transform data to match expected interface
    const transformedCompanies = companies.map(company => {
      // Determine the coordinator: prioritize company's assigned teacher, then most frequent internship coordinator
      let coordinatorTeacher = company.teacher;
      
      if (!coordinatorTeacher && company.stajlar.length > 0) {
        // Count occurrences of each coordinator
        const coordinatorCounts = new Map();
        company.stajlar.forEach(staj => {
          if (staj.teacher) {
            const teacherKey = staj.teacher.id;
            coordinatorCounts.set(teacherKey, {
              teacher: staj.teacher,
              count: (coordinatorCounts.get(teacherKey)?.count || 0) + 1
            });
          }
        });
        
        // Get the coordinator with most students
        if (coordinatorCounts.size > 0) {
          const mostActiveCoordinator = Array.from(coordinatorCounts.values())
            .sort((a, b) => b.count - a.count)[0];
          coordinatorTeacher = mostActiveCoordinator.teacher;
        }
      }

      return {
        id: company.id,
        name: company.name,
        contact: company.contact,
        phone: company.phone,
        email: company.email,
        address: company.address,
        taxNumber: company.taxNumber,
        pin: company.pin,
        teacherId: coordinatorTeacher?.id || company.teacherId,
        _count: company._count,
        teacher: coordinatorTeacher ? {
          id: coordinatorTeacher.id,
          name: coordinatorTeacher.name,
          surname: coordinatorTeacher.surname
        } : null
      }
    })

    const totalPages = Math.ceil(totalCount / perPage)

    return NextResponse.json({
      success: true,
      data: transformedCompanies,
      pagination: {
        page,
        perPage,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Companies fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Database bağlantı hatası - İşletmeler yüklenemedi',
        data: []
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // KRİTİK: Şirket oluşturma - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { name, contact, phone, email, address, taxNumber, pin, usta_ogretici_ad, usta_ogretici_telefon } = await request.json()

    if (!name || !contact) {
      return NextResponse.json(
        { error: 'İşletme adı ve yetkili kişi zorunludur' },
        { status: 400 }
      )
    }

    // Use provided PIN or generate a random 4-digit PIN for the company
    const companyPin = pin || Math.floor(1000 + Math.random() * 9000).toString()

    const company = await prisma.companyProfile.create({
      data: {
        name: name.trim(),
        contact: contact.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        taxNumber: taxNumber?.trim() || null,
        pin: companyPin,
        masterTeacherName: usta_ogretici_ad?.trim() || null,
        masterTeacherPhone: usta_ogretici_telefon?.trim() || null
        // teacherId and userId are handled via relations, not direct fields
      }
    })

    return NextResponse.json({
      id: company.id,
      name: company.name,
      contact: company.contact,
      phone: company.phone,
      email: company.email,
      address: company.address,
      taxNumber: company.taxNumber,
      pin: company.pin,
      masterTeacherName: company.masterTeacherName,
      masterTeacherPhone: company.masterTeacherPhone,
      message: `İşletme başarıyla oluşturuldu. Giriş PIN kodu: ${companyPin}`
    })
  } catch (error) {
    console.error('Company creation error:', error)
    return NextResponse.json(
      { error: 'İşletme oluşturulurken bir hata oluştu: ' + (error as Error).message },
      { status: 500 }
    )
  }
}