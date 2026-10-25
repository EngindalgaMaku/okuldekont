import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'
import { PIN_SECURITY_CONFIG } from '@/lib/pin-security'

// Mobil yönetici: öğretmen listesi ve PIN kilit durumu
export async function GET(request: Request) {
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const ogretmenler = await prisma.teacherProfile.findMany({
      orderBy: [{ name: 'asc' }, { surname: 'asc' }],
      select: {
        id: true,
        name: true,
        surname: true,
        phone: true,
        active: true,
        isLocked: true,
        lockStartTime: true,
        mustChangePin: true,
        alan: { select: { name: true } },
        _count: { select: { stajlar: { where: { status: 'ACTIVE' } } } },
      },
    })

    const now = Date.now()
    const lockMs = PIN_SECURITY_CONFIG.LOCK_DURATION_MINUTES * 60 * 1000

    return NextResponse.json({
      ogretmenler: ogretmenler.map((t) => {
        const kilitBitis =
          t.isLocked && t.lockStartTime ? t.lockStartTime.getTime() + lockMs : null
        return {
          id: t.id,
          ad: `${t.name} ${t.surname}`,
          telefon: t.phone,
          aktif: t.active,
          alan: t.alan?.name || null,
          aktifStaj: t._count.stajlar,
          kilitli: kilitBitis !== null && kilitBitis > now,
          kilitBitis: kilitBitis && kilitBitis > now ? new Date(kilitBitis) : null,
          pinDegismeli: t.mustChangePin,
        }
      }),
    })
  } catch (error) {
    console.error('Mobil öğretmen listesi hatası:', error)
    return NextResponse.json({ error: 'Öğretmenler alınamadı' }, { status: 500 })
  }
}
