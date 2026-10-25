import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'

// Mobil yönetici: aktif staj arama (öğrenci adı/no veya işletme adı)
export async function GET(request: Request) {
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const q = (new URL(request.url).searchParams.get('q') || '').trim()
  const kelimeler = q.split(/\s+/).filter((k) => k.length > 0).slice(0, 4)
  if (q.length < 2 || kelimeler.length === 0) {
    return NextResponse.json({ stajlar: [] })
  }

  try {
    const stajlar = await prisma.staj.findMany({
      where: {
        status: 'ACTIVE',
        terminationDate: null,
        archived: false,
        // Her kelime öğrenci adı, soyadı, numarası veya işletme adından birinde geçmeli
        AND: kelimeler.map((k) => ({
          OR: [
            { student: { name: { contains: k } } },
            { student: { surname: { contains: k } } },
            { student: { number: { contains: k } } },
            { company: { name: { contains: k } } },
          ],
        })),
      },
      orderBy: { startDate: 'desc' },
      take: 30,
      select: {
        id: true,
        startDate: true,
        student: { select: { name: true, surname: true, className: true, number: true } },
        company: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
    })

    return NextResponse.json({
      stajlar: stajlar.map((s) => ({
        id: s.id,
        baslangic: s.startDate,
        ogrenci: `${s.student.name} ${s.student.surname}`,
        sinif: s.student.className,
        no: s.student.number || '',
        isletme: s.company.name,
        ogretmen: s.teacher ? `${s.teacher.name} ${s.teacher.surname}` : null,
      })),
    })
  } catch (error) {
    console.error('Mobil staj arama hatası:', error)
    return NextResponse.json({ error: 'Stajlar alınamadı' }, { status: 500 })
  }
}
