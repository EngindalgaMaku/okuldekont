import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'
import { ValidationFunctions } from '@/lib/validation'

// Dekont sil - ADMIN VE TEACHER
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Dekont ID\'si gerekli' },
        { status: 400 }
      )
    }

    // ID formatını validate et
    const idValidation = ValidationFunctions.id(id)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: `Geçersiz ID formatı: ${idValidation.error}` },
        { status: 400 }
      )
    }

    // Önce dekontun var olup olmadığını kontrol et
    const existingDekont = await prisma.dekont.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        staj: {
          select: {
            student: {
              select: {
                name: true,
                surname: true
              }
            }
          }
        }
      }
    })

    if (!existingDekont) {
      return NextResponse.json(
        { error: 'Dekont bulunamadı' },
        { status: 404 }
      )
    }

    // Onaylanmış dekontları silmeyi engelle
    if (existingDekont.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Onaylanmış dekontlar silinemez' },
        { status: 403 }
      )
    }

    await prisma.dekont.delete({
      where: { id }
    })

    console.log(`✅ DEKONT DELETE: Successful deletion by ${authResult.user?.role}`, {
      dekontId: id,
      studentName: existingDekont.staj?.student ? `${existingDekont.staj.student.name} ${existingDekont.staj.student.surname}` : 'Unknown',
      userId: authResult.user?.id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true,
      message: 'Dekont başarıyla silindi'
    })
  } catch (error) {
    console.error('Dekont silinirken hata:', error)
    return NextResponse.json(
      { error: 'Dekont silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
}