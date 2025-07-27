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
    const operationId = searchParams.get('operationId')

    if (!type || !operationId) {
      return NextResponse.json({ error: 'Rapor türü ve işlem ID gerekli' }, { status: 400 })
    }

    let reportData: any = null
    let reportTitle = ''

    switch (type) {
      case 'staj-fesih':
        reportTitle = 'STAJ FESIH RAPORU'
        reportData = await getSingleTerminatedInternship(operationId)
        break
      case 'staj-atama':
        reportTitle = 'STAJ ATAMA RAPORU'
        reportData = await getSingleAssignedInternship(operationId)
        break
      case 'koordinator-degisiklik':
        reportTitle = 'KOORDINATOR DEGISIKLIK RAPORU'
        reportData = await getSingleCoordinatorChange(operationId)
        break
      default:
        return NextResponse.json({ error: 'Geçersiz rapor türü' }, { status: 400 })
    }

    if (!reportData) {
      return NextResponse.json({ error: 'İşlem bulunamadı' }, { status: 404 })
    }

    // PDF oluştur
    const pdfBuffer = await generateSinglePDF(reportTitle, reportData, type)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${type}-${operationId}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('Tek işlem raporu oluşturma hatası:', error)
    return NextResponse.json({ error: 'Rapor oluşturulamadı' }, { status: 500 })
  }
}

async function getSingleTerminatedInternship(stajId: string) {
  const staj = await prisma.staj.findUnique({
    where: {
      id: stajId,
      status: 'TERMINATED'
    },
    include: {
      student: {
        include: {
          alan: true
        }
      },
      company: true,
      teacher: true
    }
  })

  if (!staj) return null

  return {
    studentName: `${staj.student.name} ${staj.student.surname}`,
    studentNumber: staj.student.number || 'Belirtilmemiş',
    studentClass: staj.student.className,
    fieldName: staj.student.alan?.name || 'Belirtilmemiş',
    companyName: staj.company?.name || 'Belirtilmemiş',
    companyContact: staj.company?.contact || 'Belirtilmemiş',
    teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : 'Atanmamış',
    startDate: staj.startDate,
    endDate: staj.endDate,
    terminatedAt: staj.terminationDate,
    terminationReason: staj.terminationReason || 'Belirtilmemiş',
    terminationNotes: staj.terminationNotes || ''
  }
}

async function getSingleAssignedInternship(stajId: string) {
  const staj = await prisma.staj.findUnique({
    where: {
      id: stajId,
      status: 'ACTIVE'
    },
    include: {
      student: {
        include: {
          alan: true
        }
      },
      company: true,
      teacher: true
    }
  })

  if (!staj) return null

  return {
    studentName: `${staj.student.name} ${staj.student.surname}`,
    studentNumber: staj.student.number || 'Belirtilmemiş',
    studentClass: staj.student.className,
    fieldName: staj.student.alan?.name || 'Belirtilmemiş',
    companyName: staj.company?.name || 'Belirtilmemiş',
    companyContact: staj.company?.contact || 'Belirtilmemiş',
    teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : 'Atanmamış',
    startDate: staj.startDate,
    endDate: staj.endDate,
    assignedAt: staj.createdAt
  }
}

async function getSingleCoordinatorChange(changeId: string) {
  const change = await prisma.teacherAssignmentHistory.findUnique({
    where: {
      id: changeId
    },
    include: {
      company: true,
      teacher: true,
      previousTeacher: true,
      assignedByUser: true
    }
  })

  if (!change) return null

  return {
    companyName: change.company?.name || 'Belirtilmemiş',
    companyContact: change.company?.contact || 'Belirtilmemiş',
    newTeacherName: change.teacher ? `${change.teacher.name} ${change.teacher.surname}` : 'Atanmamış',
    previousTeacherName: change.previousTeacher ? `${change.previousTeacher.name} ${change.previousTeacher.surname}` : 'Atanmamış',
    assignedAt: change.assignedAt,
    assignedBy: change.assignedByUser?.email || 'Bilinmeyen',
    reason: change.reason || 'Belirtilmemiş',
    notes: change.notes || ''
  }
}

async function generateSinglePDF(title: string, data: any, type: string): Promise<Buffer> {
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
    // Student info section with box
    doc.setFillColor(245, 245, 245)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('OGRENCI BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Ad Soyad: ${normalizeTurkishText(data.studentName)}`, 25, yPos)
    yPos += 7
    doc.text(`Sinif: ${normalizeTurkishText(data.studentClass)}`, 25, yPos)
    yPos += 7
    doc.text(`Okul No: ${data.studentNumber}`, 25, yPos)
    yPos += 7
    doc.text(`Alan: ${normalizeTurkishText(data.fieldName)}`, 25, yPos)
    yPos += 12

    // Company info section
    doc.setFillColor(240, 248, 255)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('ISLETME BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFont('helvetica', 'normal')
    doc.text(`Isletme Adi: ${normalizeTurkishText(data.companyName)}`, 25, yPos)
    yPos += 7
    doc.text(`Iletisim: ${normalizeTurkishText(data.companyContact)}`, 25, yPos)
    yPos += 12

    // Coordinator info section
    doc.setFillColor(255, 248, 240)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('KOORDINATOR BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFont('helvetica', 'normal')
    doc.text(`Koordinator: ${normalizeTurkishText(data.teacherName)}`, 25, yPos)
    yPos += 12

    // Internship info section
    doc.setFillColor(248, 255, 240)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('STAJ BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFont('helvetica', 'normal')
    doc.text(`Baslangic Tarihi: ${data.startDate ? new Date(data.startDate).toLocaleDateString('tr-TR') : 'Belirtilmemis'}`, 25, yPos)
    yPos += 7
    doc.text(`Fesih Tarihi: ${data.terminatedAt ? new Date(data.terminatedAt).toLocaleDateString('tr-TR') : 'Belirtilmemis'}`, 25, yPos)
    yPos += 12

    // Termination info section
    doc.setFillColor(255, 240, 240)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('FESIH BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFont('helvetica', 'normal')
    doc.text(`Fesih Nedeni: ${normalizeTurkishText(data.terminationReason)}`, 25, yPos)
    yPos += 7
    
    if (data.terminationNotes && data.terminationNotes.trim()) {
      doc.text('Notlar:', 25, yPos)
      yPos += 7
      const normalizedNotes = normalizeTurkishText(data.terminationNotes)
      const notes = doc.splitTextToSize(normalizedNotes, 160)
      doc.text(notes, 25, yPos)
      yPos += notes.length * 7
    }

  } else if (type === 'staj-atama') {
    // Student info section
    doc.setFillColor(245, 245, 245)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('OGRENCI BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Ad Soyad: ${normalizeTurkishText(data.studentName)}`, 25, yPos)
    yPos += 7
    doc.text(`Sinif: ${normalizeTurkishText(data.studentClass)}`, 25, yPos)
    yPos += 7
    doc.text(`Okul No: ${data.studentNumber}`, 25, yPos)
    yPos += 7
    doc.text(`Alan: ${normalizeTurkishText(data.fieldName)}`, 25, yPos)
    yPos += 12

    // Company info section
    doc.setFillColor(240, 248, 255)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('ISLETME BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFont('helvetica', 'normal')
    doc.text(`Isletme Adi: ${normalizeTurkishText(data.companyName)}`, 25, yPos)
    yPos += 7
    doc.text(`Iletisim: ${normalizeTurkishText(data.companyContact)}`, 25, yPos)
    yPos += 12

    // Coordinator info section
    doc.setFillColor(255, 248, 240)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('KOORDINATOR BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFont('helvetica', 'normal')
    doc.text(`Koordinator: ${normalizeTurkishText(data.teacherName)}`, 25, yPos)
    yPos += 12

    // Assignment info section
    doc.setFillColor(248, 255, 240)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('ATAMA BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFont('helvetica', 'normal')
    doc.text(`Baslangic Tarihi: ${data.startDate ? new Date(data.startDate).toLocaleDateString('tr-TR') : 'Belirtilmemis'}`, 25, yPos)
    yPos += 7
    doc.text(`Bitis Tarihi: ${data.endDate ? new Date(data.endDate).toLocaleDateString('tr-TR') : 'Belirtilmemis'}`, 25, yPos)
    yPos += 7
    doc.text(`Atama Tarihi: ${new Date(data.assignedAt).toLocaleDateString('tr-TR')}`, 25, yPos)

  } else if (type === 'koordinator-degisiklik') {
    // Company info section
    doc.setFillColor(240, 248, 255)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('ISLETME BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Isletme Adi: ${normalizeTurkishText(data.companyName)}`, 25, yPos)
    yPos += 7
    doc.text(`Iletisim: ${normalizeTurkishText(data.companyContact)}`, 25, yPos)
    yPos += 12

    // Change info section
    doc.setFillColor(255, 248, 240)
    doc.rect(15, yPos - 5, 180, 8, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(normalizeTurkishText('KOORDINATOR DEGISIKLIK BILGILERI'), 20, yPos)
    yPos += 15

    doc.setFont('helvetica', 'normal')
    doc.text(`Onceki Koordinator: ${normalizeTurkishText(data.previousTeacherName)}`, 25, yPos)
    yPos += 7
    doc.text(`Yeni Koordinator: ${normalizeTurkishText(data.newTeacherName)}`, 25, yPos)
    yPos += 7
    doc.text(`Degisiklik Tarihi: ${new Date(data.assignedAt).toLocaleDateString('tr-TR')}`, 25, yPos)
    yPos += 7
    doc.text(`Degisiklik Yapan: ${normalizeTurkishText(data.assignedBy)}`, 25, yPos)
    yPos += 12

    if (data.reason && data.reason.trim()) {
      doc.setFillColor(248, 255, 240)
      doc.rect(15, yPos - 5, 180, 8, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(normalizeTurkishText('DEGISIKLIK NEDENI'), 20, yPos)
      yPos += 15

      doc.setFont('helvetica', 'normal')
      const normalizedReason = normalizeTurkishText(data.reason)
      const reasons = doc.splitTextToSize(normalizedReason, 160)
      doc.text(reasons, 25, yPos)
      yPos += reasons.length * 7
    }

    if (data.notes && data.notes.trim()) {
      yPos += 5
      doc.setFillColor(255, 240, 240)
      doc.rect(15, yPos - 5, 180, 8, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(normalizeTurkishText('NOTLAR'), 20, yPos)
      yPos += 15

      doc.setFont('helvetica', 'normal')
      const normalizedNotes = normalizeTurkishText(data.notes)
      const notes = doc.splitTextToSize(normalizedNotes, 160)
      doc.text(notes, 25, yPos)
    }
  }

  // Add footer
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Sayfa 1 / 1', 105, 285, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}