import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    return NextResponse.json({
      id: company.id,
      ad: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      yetkili_kisi: company.contact,
      pin: company.pin,
      taxNumber: company.taxNumber,
      teacherId: company.teacherId,
      teacher: company.teacher ? {
        id: company.teacher.id,
        name: company.teacher.name,
        surname: company.teacher.surname,
        alanId: company.teacher.alanId
      } : null
    })
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
    const data = await request.json()
    
    const updatedCompany = await prisma.companyProfile.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        contact: data.contact,
        pin: data.pin,
        taxNumber: data.taxNumber,
        // Add other fields as needed
      },
    })

    return NextResponse.json(updatedCompany)
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}