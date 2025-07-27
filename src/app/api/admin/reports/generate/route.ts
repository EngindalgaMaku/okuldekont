import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jsPDF } from 'jspdf'

// Turkish character mapping for PDF compatibility
function normalizeTurkishText(text: string): string {
  return text
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const fieldId = searchParams.get('fieldId')

    if (!type) {
      return NextResponse.json({ error: 'Rapor türü gerekli' }, { status: 400 })
    }

    let reportData: any[] = []
    let reportTitle = ''

    switch (type) {
      case 'staj-fesih':
        reportTitle = 'STAJ FESIH RAPORU'
        reportData = await getTerminatedInternships(startDate, endDate, fieldId)
        break
      case 'staj-atama':
        reportTitle = 'STAJ ATAMA RAPORU'
        reportData = await getAssignedInternships(startDate, endDate, fieldId)
        break
      case 'koordinator-degisiklik':
        reportTitle = 'KOORDINATOR DEGISIKLIK RAPORU'
        reportData = await getCoordinatorChanges(startDate, endDate, fieldId)
        break
      default:
        return NextResponse.json({ error: 'Geçersiz rapor türü' }, { status: 400 })
    }

    // PDF oluştur
    const pdfBuffer = await generatePDF(reportTitle, reportData, type)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${type}-raporu-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('Rapor oluşturma hatası:', error)
    return NextResponse.json({ error: 'Rapor oluşturulamadı' }, { status: 500 })
  }
}

async function getTerminatedInternships(startDate?: string | null, endDate?: string | null, fieldId?: string | null) {
  const where: any = {
    status: 'TERMINATED'
  }

  if (startDate || endDate) {
    where.terminationDate = {}
    if (startDate) where.terminationDate.gte = new Date(startDate)
    if (endDate) where.terminationDate.lte = new Date(endDate)
  }

  if (fieldId) {
    where.student = {
      alanId: fieldId
    }
  }

  const stajlar = await prisma.staj.findMany({
    where,
    include: {
      student: {
        include: {
          alan: true
        }
      },
      company: true,
      teacher: true
    },
    orderBy: { terminationDate: 'desc' }
  })

  return stajlar.map((staj: any) => ({
    studentName: `${staj.student.name} ${staj.student.surname}`,
    studentNumber: staj.student.number || 'Belirtilmemiş',
    studentClass: staj.student.className,
    fieldName: staj.student.alan?.name || 'Belirtilmemiş',
    companyName: staj.company.name,
    companyContact: staj.company.contact,
    teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : 'Atanmamış',
    startDate: staj.startDate,
    endDate: staj.endDate,
    terminatedAt: staj.terminationDate,
    terminationReason: staj.terminationReason || 'Belirtilmemiş',
    terminationNotes: staj.terminationNotes || ''
  }))
}

async function getAssignedInternships(startDate?: string | null, endDate?: string | null, fieldId?: string | null) {
  const where: any = {
    status: 'ACTIVE'
  }

  if (startDate || endDate) {
    where.startDate = {}
    if (startDate) where.startDate.gte = new Date(startDate)
    if (endDate) where.startDate.lte = new Date(endDate)
  }

  if (fieldId) {
    where.student = {
      alanId: fieldId
    }
  }

  const stajlar = await prisma.staj.findMany({
    where,
    include: {
      student: {
        include: {
          alan: true
        }
      },
      company: true,
      teacher: true
    },
    orderBy: { startDate: 'desc' }
  })

  return stajlar.map((staj: any) => ({
    studentName: `${staj.student.name} ${staj.student.surname}`,
    studentNumber: staj.student.number || 'Belirtilmemiş',
    studentClass: staj.student.className,
    fieldName: staj.student.alan?.name || 'Belirtilmemiş',
    companyName: staj.company.name,
    companyContact: staj.company.contact,
    teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : 'Atanmamış',
    startDate: staj.startDate,
    endDate: staj.endDate,
    assignedAt: staj.createdAt
  }))
}

async function getCoordinatorChanges(startDate?: string | null, endDate?: string | null, fieldId?: string | null) {
  const where: any = {}

  if (startDate || endDate) {
    where.assignedAt = {}
    if (startDate) where.assignedAt.gte = new Date(startDate)
    if (endDate) where.assignedAt.lte = new Date(endDate)
  }

  if (fieldId) {
    where.teacher = {
      alanId: fieldId
    }
  }

  const changes = await prisma.teacherAssignmentHistory.findMany({
    where,
    include: {
      company: true,
      teacher: true,
      previousTeacher: true,
      assignedByUser: true
    },
    orderBy: { assignedAt: 'desc' }
  })

  return changes.map((change: any) => ({
    companyName: change.company.name,
    companyContact: change.company.contact,
    newTeacherName: change.teacher ? `${change.teacher.name} ${change.teacher.surname}` : 'Atanmamış',
    previousTeacherName: change.previousTeacher ? `${change.previousTeacher.name} ${change.previousTeacher.surname}` : 'Atanmamış',
    assignedAt: change.assignedAt,
    assignedBy: change.assignedByUser?.email || 'Bilinmeyen',
    reason: change.reason || 'Belirtilmemiş',
    notes: change.notes || ''
  }))
}

async function generatePDF(title: string, data: any[], type: string): Promise<Buffer> {
  const doc = new jsPDF('p', 'mm', 'a4')
  
  // Get school name
  const schoolName = 'HUSN İYE OZD İLEK MESLEKI VE TEKNIK ANADOLU L İSESI'
  
  // PDF için encoding ayarla
  doc.setProperties({
    title: 'Staj Raporu',
    creator: 'K-Panel',
    subject: 'Staj İşlem Raporu'
  })
  
  // School name header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(normalizeTurkishText(schoolName), 105, 20, { align: 'center' })
  
  // Report type subtitle
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  let subtitle = ''
  if (type === 'staj-fesih') subtitle = 'FESIH RAPORUDUR'
  else if (type === 'staj-atama') subtitle = 'STAJ ATAMA RAPORUDUR'
  else if (type === 'koordinator-degisiklik') subtitle = 'KOORDINATOR DEGISIKLIK RAPORUDUR'
  
  doc.text(normalizeTurkishText(subtitle), 105, 30, { align: 'center' })
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 105, 40, { align: 'center' })
  
  // Add line separator
  doc.setLineWidth(0.5)
  doc.line(20, 47, 190, 47)
  
  let yPos = 60

  if (type === 'staj-fesih') {
    data.forEach((item, index) => {
      if (yPos > 260) {
        doc.addPage()
        yPos = 25
      }

      // Student info section with box
      doc.setFillColor(245, 245, 245)
      doc.rect(15, yPos - 5, 180, 8, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(normalizeTurkishText(`${index + 1}. OGRENCI BILGILERI`), 20, yPos)
      yPos += 15

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Ad Soyad: ${normalizeTurkishText(item.studentName)}`, 25, yPos)
      yPos += 7
      doc.text(`Sinif: ${normalizeTurkishText(item.studentClass)}`, 25, yPos)
      yPos += 7
      doc.text(`Okul No: ${item.studentNumber}`, 25, yPos)
      yPos += 7
      doc.text(`Alan: ${normalizeTurkishText(item.fieldName)}`, 25, yPos)
      yPos += 12

      // Company info section
      doc.setFillColor(240, 248, 255)
      doc.rect(15, yPos - 5, 180, 8, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(normalizeTurkishText('ISLETME BILGILERI'), 20, yPos)
      yPos += 15

      doc.setFont('helvetica', 'normal')
      doc.text(`Isletme Adi: ${normalizeTurkishText(item.companyName)}`, 25, yPos)
      yPos += 7
      doc.text(`Iletisim: ${normalizeTurkishText(item.companyContact)}`, 25, yPos)
      yPos += 12

      // Coordinator info section
      doc.setFillColor(255, 248, 240)
      doc.rect(15, yPos - 5, 180, 8, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(normalizeTurkishText('KOORDINATOR BILGILERI'), 20, yPos)
      yPos += 15

      doc.setFont('helvetica', 'normal')
      doc.text(`Koordinator: ${normalizeTurkishText(item.teacherName)}`, 25, yPos)
      yPos += 12

      // Internship info section
      doc.setFillColor(248, 255, 240)
      doc.rect(15, yPos - 5, 180, 8, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(normalizeTurkishText('STAJ BILGILERI'), 20, yPos)
      yPos += 15

      doc.setFont('helvetica', 'normal')
      doc.text(`Baslangic Tarihi: ${item.startDate ? new Date(item.startDate).toLocaleDateString('tr-TR') : 'Belirtilmemis'}`, 25, yPos)
      yPos += 7
      doc.text(`Fesih Tarihi: ${item.terminatedAt ? new Date(item.terminatedAt).toLocaleDateString('tr-TR') : 'Belirtilmemis'}`, 25, yPos)
      yPos += 12

      // Termination info section
      doc.setFillColor(255, 240, 240)
      doc.rect(15, yPos - 5, 180, 8, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(normalizeTurkishText('FESIH BILGILERI'), 20, yPos)
      yPos += 15

      doc.setFont('helvetica', 'normal')
      doc.text(`Fesih Nedeni: ${normalizeTurkishText(item.terminationReason)}`, 25, yPos)
      yPos += 7
      
      if (item.terminationNotes && item.terminationNotes.trim()) {
        doc.text('Notlar:', 25, yPos)
        yPos += 7
        const normalizedNotes = normalizeTurkishText(item.terminationNotes)
        const notes = doc.splitTextToSize(normalizedNotes, 160)
        doc.text(notes, 25, yPos)
        yPos += notes.length * 7
      }

      yPos += 20 // Space between records
      
      // Add separator line
      if (index < data.length - 1) {
        doc.setLineWidth(0.3)
        doc.line(20, yPos - 10, 190, yPos - 10)
      }
    })
  } else if (type === 'staj-atama') {
    data.forEach((item, index) => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 25
      }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`${index + 1}. ${normalizeTurkishText(item.studentName)} - ${normalizeTurkishText(item.studentClass)}`, 20, yPos)
      yPos += 8

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Isletme: ${normalizeTurkishText(item.companyName)}`, 25, yPos)
      yPos += 6
      doc.text(`Koordinator: ${normalizeTurkishText(item.teacherName)}`, 25, yPos)
      yPos += 6
      doc.text(`Atama Tarihi: ${new Date(item.assignedAt).toLocaleDateString('tr-TR')}`, 25, yPos)
      yPos += 12
    })
  } else if (type === 'koordinator-degisiklik') {
    data.forEach((item, index) => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 25
      }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`${index + 1}. ${normalizeTurkishText(item.companyName)}`, 20, yPos)
      yPos += 8

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Onceki Koordinator: ${normalizeTurkishText(item.previousTeacherName)}`, 25, yPos)
      yPos += 6
      doc.text(`Yeni Koordinator: ${normalizeTurkishText(item.newTeacherName)}`, 25, yPos)
      yPos += 6
      doc.text(`Degisiklik Tarihi: ${new Date(item.assignedAt).toLocaleDateString('tr-TR')}`, 25, yPos)
      yPos += 6
      if (item.reason) {
        doc.text(`Neden: ${normalizeTurkishText(item.reason)}`, 25, yPos)
        yPos += 6
      }
      yPos += 12
    })
  }

  // Add footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Sayfa ${i} / ${pageCount}`, 105, 285, { align: 'center' })
  }

  return Buffer.from(doc.output('arraybuffer'))
}