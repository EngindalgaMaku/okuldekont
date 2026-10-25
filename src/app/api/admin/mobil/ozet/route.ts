import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'
import { PIN_SECURITY_CONFIG } from '@/lib/pin-security'

// Mobil yönetici ana sayfası: genel sayılar
export async function GET(request: Request) {
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const kilitBaslangici = new Date(Date.now() - PIN_SECURITY_CONFIG.LOCK_DURATION_MINUTES * 60 * 1000)
    const [bekleyenDekont, aktifStaj, kilitliOgretmen, okul] = await Promise.all([
      prisma.dekont.count({ where: { status: 'PENDING', archived: false } }),
      prisma.staj.count({ where: { status: 'ACTIVE', terminationDate: null, archived: false } }),
      prisma.teacherProfile.count({ where: { isLocked: true, lockStartTime: { gt: kilitBaslangici } } }),
      prisma.systemSetting.findFirst({ where: { key: 'school_name' }, select: { value: true } }),
    ])

    return NextResponse.json({
      bekleyenDekont,
      aktifStaj,
      kilitliOgretmen,
      okulAdi: okul?.value || null,
    })
  } catch (error) {
    console.error('Mobil özet hatası:', error)
    return NextResponse.json({ error: 'Özet alınamadı' }, { status: 500 })
  }
}
