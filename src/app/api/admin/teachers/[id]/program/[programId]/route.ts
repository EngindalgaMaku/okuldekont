import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    const { id: teacherId, programId } = await params

    // Programın varlığını ve öğretmene ait olup olmadığını kontrol et
    const program = await prisma.koordinatorlukProgrami.findFirst({
      where: {
        id: programId,
        ogretmenId: teacherId
      }
    })

    if (!program) {
      return NextResponse.json({ error: 'Program bulunamadı' }, { status: 404 })
    }

    await prisma.koordinatorlukProgrami.delete({
      where: {
        id: programId
      }
    })

    return NextResponse.json({ message: 'Program başarıyla silindi' })
  } catch (error) {
    console.error('Program silme hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}