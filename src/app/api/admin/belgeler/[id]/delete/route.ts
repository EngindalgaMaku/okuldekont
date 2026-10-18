import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Önce belgeyi bul
    const belge = await prisma.belge.findUnique({
      where: { id }
    })

    if (!belge) {
      return NextResponse.json(
        { error: 'Belge bulunamadı' },
        { status: 404 }
      )
    }

    // Dosyayı sil
    try {
      const filePath = path.join(process.cwd(), 'public', belge.dosyaUrl)
      await unlink(filePath)
    } catch (error) {
      console.warn('Dosya silinemedi:', error)
      // Dosya silinmese bile database'den belgeyi sil
    }

    // Database'den belgeyi sil
    await prisma.belge.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Belge ve dosya başarıyla silindi'
    })

  } catch (error) {
    console.error('Belge silme hatası:', error)
    return NextResponse.json(
      { error: 'Belge silme işlemi başarısız' },
      { status: 500 }
    )
  }
}