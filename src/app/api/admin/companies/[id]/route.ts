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
      name: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      contact: company.contact,
      pin: company.pin,
      taxNumber: company.taxNumber,
      activityField: (company as any).activityField,
      bankAccountNo: (company as any).bankAccountNo,
      employeeCount: (company as any).employeeCount,
      stateContributionRequest: (company as any).stateContributionRequest,
      masterTeacherName: (company as any).masterTeacherName,
      masterTeacherPhone: (company as any).masterTeacherPhone,
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
        activityField: data.activityField,
        bankAccountNo: data.bankAccountNo,
        employeeCount: data.employeeCount,
        stateContributionRequest: data.stateContributionRequest,
        masterTeacherName: data.masterTeacherName,
        masterTeacherPhone: data.masterTeacherPhone,
      },
    })

    return NextResponse.json(updatedCompany)
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if company exists
    const company = await prisma.companyProfile.findUnique({
      where: { id },
      include: {
        stajlar: true,
        dekontlar: true,
        belgeler: true,
        students: true
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 })
    }

    // Check for active internships
    const activeInternships = company.stajlar.filter(staj => staj.status === 'ACTIVE')
    if (activeInternships.length > 0) {
      return NextResponse.json({
        error: `Bu işletmede ${activeInternships.length} aktif stajyer bulunuyor. Önce stajları sonlandırın.`
      }, { status: 400 })
    }

    // Delete related records in order (due to foreign key constraints)
    await prisma.$transaction(async (tx) => {
      // First, get all internship IDs for this company
      const internships = await tx.staj.findMany({
        where: { companyId: id },
        select: { id: true }
      })

      const internshipIds = internships.map(i => i.id)

      // Delete internship history first (if any)
      if (internshipIds.length > 0) {
        await tx.internshipHistory.deleteMany({
          where: {
            internshipId: { in: internshipIds }
          }
        })
      }

      // Delete dekontlar
      await tx.dekont.deleteMany({
        where: { companyId: id }
      })

      // Delete belgeler
      await tx.belge.deleteMany({
        where: { isletmeId: id }
      })

      // Delete internships (stajlar)
      await tx.staj.deleteMany({
        where: { companyId: id }
      })

      // Update students to remove company reference
      await tx.student.updateMany({
        where: { companyId: id },
        data: { companyId: null }
      })

      // Finally delete the company
      await tx.companyProfile.delete({
        where: { id }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'İşletme ve tüm ilişkili veriler başarıyla silindi'
    })

  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json({
      error: 'İşletme silinirken bir hata oluştu: ' + (error as Error).message
    }, { status: 500 })
  }
}