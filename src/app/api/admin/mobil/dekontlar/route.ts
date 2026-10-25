import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'

const DURUMLAR = ['PENDING', 'APPROVED', 'REJECTED'] as const
type Durum = (typeof DURUMLAR)[number]

// Mobil yönetici: dekont listesi. Varsayılan onay bekleyenler (eskiden yeniye);
// ?durum=APPROVED|REJECTED|ALL ve ?ay=&yil= ile önceki aylar ve kararlar da görülebilir.
export async function GET(request: Request) {
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const sp = new URL(request.url).searchParams
    const durumParam = (sp.get('durum') || 'PENDING').toUpperCase()
    const durum: Durum | null = (DURUMLAR as readonly string[]).includes(durumParam) ? (durumParam as Durum) : null
    const ay = parseInt(sp.get('ay') || '')
    const yil = parseInt(sp.get('yil') || '')

    const where: Prisma.DekontWhereInput = {
      archived: false,
      ...(durum ? { status: durum } : {}),
      ...(ay >= 1 && ay <= 12 && yil > 2000 ? { month: ay, year: yil } : {}),
    }

    const [dekontlar, toplam] = await Promise.all([
      prisma.dekont.findMany({
        where,
        // Bekleyenler sırayla incelensin diye eskiden yeniye, diğerleri en yeniden
        orderBy: { createdAt: durum === 'PENDING' ? 'asc' : 'desc' },
        take: 200,
        select: {
          id: true,
          amount: true,
          month: true,
          year: true,
          sequenceNumber: true,
          status: true,
          rejectReason: true,
          fileUrl: true,
          createdAt: true,
          student: { select: { name: true, surname: true, className: true, number: true } },
          company: { select: { name: true } },
          teacher: { select: { name: true, surname: true } },
        },
      }),
      prisma.dekont.count({ where }),
    ])

    return NextResponse.json({
      toplam,
      dekontlar: dekontlar.map((d) => ({
        id: d.id,
        miktar: d.amount ? Number(d.amount) : null,
        ay: d.month,
        yil: d.year,
        sira: d.sequenceNumber,
        durum: d.status,
        redNedeni: d.rejectReason,
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
    console.error('Mobil dekont listesi hatası:', error)
    return NextResponse.json({ error: 'Dekontlar alınamadı' }, { status: 500 })
  }
}
