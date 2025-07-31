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
    
    // Get current company data for comparison
    const currentCompany = await prisma.companyProfile.findUnique({
      where: { id }
    })

    if (!currentCompany) {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 })
    }

    // Compare and track changes
    const changes: Array<{
      fieldName: string
      changeType: string
      previousValue: any
      newValue: any
    }> = []

    // Define fields to track
    const fieldsToTrack = [
      { field: 'name', changeType: 'CONTACT_INFO_UPDATE' },
      { field: 'address', changeType: 'ADDRESS_UPDATE' },
      { field: 'phone', changeType: 'CONTACT_INFO_UPDATE' },
      { field: 'email', changeType: 'CONTACT_INFO_UPDATE' },
      { field: 'contact', changeType: 'CONTACT_INFO_UPDATE' },
      { field: 'pin', changeType: 'OTHER_UPDATE' },
      { field: 'taxNumber', changeType: 'OTHER_UPDATE' },
      { field: 'activityField', changeType: 'ACTIVITY_FIELD_UPDATE' },
      { field: 'bankAccountNo', changeType: 'BANK_ACCOUNT_UPDATE' },
      { field: 'employeeCount', changeType: 'EMPLOYEE_COUNT_UPDATE' },
      { field: 'stateContributionRequest', changeType: 'OTHER_UPDATE' },
      { field: 'masterTeacherName', changeType: 'MASTER_TEACHER_UPDATE' },
      { field: 'masterTeacherPhone', changeType: 'MASTER_TEACHER_UPDATE' }
    ]

    // Check for changes
    fieldsToTrack.forEach(({ field, changeType }) => {
      const currentValue = (currentCompany as any)[field]
      const newValue = data[field]
      
      if (currentValue !== newValue) {
        changes.push({
          fieldName: field,
          changeType,
          previousValue: currentValue,
          newValue: newValue
        })
      }
    })

    // Update company and create history records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the company
      const updatedCompany = await tx.companyProfile.update({
        where: { id },
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

      // Create history records for changes
      if (changes.length > 0) {
        const now = new Date()
        
        for (const change of changes) {
          // Close previous record for this field
          await tx.companyHistory.updateMany({
            where: {
              companyId: id,
              fieldName: change.fieldName,
              validTo: null
            },
            data: { validTo: now }
          })

          // Create new history record
          await tx.companyHistory.create({
            data: {
              companyId: id,
              changeType: change.changeType as any,
              fieldName: change.fieldName,
              previousValue: change.previousValue ? String(change.previousValue) : null,
              newValue: change.newValue ? String(change.newValue) : null,
              validFrom: now,
              changedBy: 'cmdbwoyma0001qva4qnz7qde5', // TODO: Get actual admin ID from session
              reason: 'Admin tarafından güncellendi'
            }
          })
        }
      }

      return updatedCompany
    })

    console.log(`Company updated: ${changes.length} changes tracked for company ${id}`)

    return NextResponse.json(result)
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