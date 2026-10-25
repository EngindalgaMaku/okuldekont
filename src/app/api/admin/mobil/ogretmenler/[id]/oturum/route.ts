import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'
import { belirtecOlustur } from '@/lib/impersonation'

// Mobil yönetici: öğretmen hesabına geçiş için belirteç üretir.
// Giriş belirteci istemcide signIn("yonetici-ogretmen") ile kullanılır;
// dönüş belirteci tarayıcıda saklanıp "Yönetici hesabına dön" ile kullanılır.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success || !authResult.user?.id) {
    return NextResponse.json({ error: authResult.error || 'Yetkisiz' }, { status: authResult.status || 403 })
  }

  try {
    const { id } = await params
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id },
      select: { id: true, name: true, surname: true },
    })
    if (!teacher) {
      return NextResponse.json({ error: 'Öğretmen bulunamadı' }, { status: 404 })
    }

    const adminId = authResult.user.id
    const adminEmail = authResult.user.email || ''
    console.warn('Yönetici öğretmen hesabına geçiş belirteci istedi', { adminEmail, teacherId: teacher.id })

    return NextResponse.json({
      girisToken: belirtecOlustur('giris', adminId, adminEmail, teacher.id),
      donusToken: belirtecOlustur('donus', adminId, adminEmail, teacher.id),
      ogretmen: `${teacher.name} ${teacher.surname}`,
    })
  } catch (error) {
    console.error('Öğretmen oturumu belirteci hatası:', error)
    return NextResponse.json({ error: 'İşlem yapılamadı' }, { status: 500 })
  }
}
