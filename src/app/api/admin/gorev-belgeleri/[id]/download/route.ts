import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { id } = await params

    // HTML yazdırma sayfasına yönlendir (yazıcı çıktısı için)
    const printUrl = new URL(`/gorev-belgesi/yazdir/${id}`, request.url)
    return NextResponse.redirect(printUrl, 302)

  } catch (error) {
    console.error('Görev belgesi download hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}