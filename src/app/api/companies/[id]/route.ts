import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Next.js cache'ini devre dışı bırak
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const company = await prisma.companyProfile.findUnique({
      where: {
        id,
      },
      include: {
        teacher: {
          include: {
            alan: true
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const response = NextResponse.json({
      id: company.id,
      ad: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      yetkili_kisi: company.contact,
      mustChangePin: company.mustChangePin,
      taxNumber: company.taxNumber,
      teacherId: company.teacherId,
      teacher: company.teacher ? {
        id: company.teacher.id,
        name: company.teacher.name,
        surname: company.teacher.surname,
        alanId: company.teacher.alanId
      } : null
    });
    
    // Cache-control headers - mobil cache sorununu çözmek için
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { pin } = await request.json()

    // Bu rota yalnızca işletmenin kendi PIN'ini değiştirmesi içindir.
    // İşletme bilgilerinin düzenlenmesi /api/admin/companies/[id] üzerinden yapılır.
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN 4 haneli rakamlardan oluşmalıdır' }, { status: 400 })
    }

    await prisma.companyProfile.update({
      where: { id },
      data: { pin, mustChangePin: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}