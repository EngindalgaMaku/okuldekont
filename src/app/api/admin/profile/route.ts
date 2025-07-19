import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, surname, email } = await request.json()

    // Update admin profile
    await prisma.adminProfile.update({
      where: { email: session.user.email },
      data: {
        name: `${name} ${surname}`,
      }
    })

    return NextResponse.json({ message: 'Profil başarıyla güncellendi' })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Profil güncellenirken hata oluştu' }, { status: 500 })
  }
}