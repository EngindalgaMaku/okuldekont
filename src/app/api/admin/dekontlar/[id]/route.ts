import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'
import { ValidationFunctions } from '@/lib/validation'

// Dekont sil - ADMIN VE TEACHER
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params

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

    // Transaction ile atomic delete işlemi
    const result = await prisma.$transaction(async (tx) => {
      // Önce dekontun var olup olmadığını ve durumunu kontrol et
      const existingDekont = await tx.dekont.findUnique({
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
        throw new Error('DEKONT_NOT_FOUND')
      }

      // Onaylanmış dekontları silmeyi engelle
      if (existingDekont.status === 'APPROVED') {
        throw new Error('APPROVED_DEKONT_DELETE_DENIED')
      }

      // Dekontı sil
      await tx.dekont.delete({
        where: { id }
      })

      return existingDekont
    })

    console.log(`✅ DEKONT DELETE: Successful deletion by ${authResult.user?.role}`, {
      dekontId: id,
      studentName: result.staj?.student ? `${result.staj.student.name} ${result.staj.student.surname}` : 'Unknown',
      userId: authResult.user?.id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Dekont başarıyla silindi'
    })
  } catch (error) {
    console.error('Dekont silinirken hata:', error)
    
    // Özel hata durumlarını yakala
    if (error instanceof Error) {
      if (error.message === 'DEKONT_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Dekont bulunamadı' },
          { status: 404 }
        )
      }
      
      if (error.message === 'APPROVED_DEKONT_DELETE_DENIED') {
        return NextResponse.json(
          { error: 'Onaylanmış dekontlar silinemez' },
          { status: 403 }
        )
      }
    }

    // MySQL race condition hatası için özel mesaj
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message)
      if (errorMessage.includes('Record has changed since last read')) {
        return NextResponse.json(
          { error: 'Dekont başka bir işlem tarafından değiştirildi. Lütfen sayfayı yenileyin ve tekrar deneyin.' },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Dekont silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
}