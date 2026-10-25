import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'

// Mobil yönetici: onay bekleyen dekontlar (eskiden yeniye)
export async function GET(request: Request) {
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const [dekontlar, toplam] = await Promise.all([
      prisma.dekont.findMany({
        where: { status: 'PENDING', archived: false },
        orderBy: { createdAt: 'asc' },
        take: 200,
        select: {
          id: true,
          amount: true,
          month: true,
          year: true,
          sequenceNumber: true,
          fileUrl: true,
          createdAt: true,
          student: { select: { name: true, surname: true, className: true, number: true } },
          company: { select: { name: true } },
          teacher: { select: { name: true, surname: true } },
        },
      }),
      prisma.dekont.count({ where: { status: 'PENDING', archived: false } }),
    ])

    return NextResponse.json({
      toplam,
      dekontlar: dekontlar.map((d) => ({
        id: d.id,
        miktar: d.amount ? Number(d.amount) : null,
        ay: d.month,
        yil: d.year,
        sira: d.sequenceNumber,
        dosyaUrl: d.fileUrl,
        yuklenme: d.createdAt,
        ogrenci: d.student ? `${d.student.name} ${d.student.surname}` : '-',
        sinif: d.student?.className || '',
        no: d.student?.number || '',
        isletme: d.company?.name || '-',
        ogretmen: d.teacher ? `${d.teacher.name} ${d.teacher.surname}` : null,
      })),
    })
  } catch (error) {
    console.error('Mobil bekleyen dekontlar hatası:', error)
    return NextResponse.json({ error: 'Dekontlar alınamadı' }, { status: 500 })
  }
}
