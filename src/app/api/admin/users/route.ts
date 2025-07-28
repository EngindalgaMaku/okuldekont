import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminProfiles = await prisma.adminProfile.findMany({
      include: {
        user: {
          select: {
            createdAt: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    })

    // Transform to match expected format
    const transformedProfiles = adminProfiles.map((profile: any) => {
      const nameParts = profile.name.split(' ')
      return {
        id: profile.id,
        ad: nameParts[0] || '',
        soyad: nameParts.slice(1).join(' ') || '',
        email: profile.email,
        yetki_seviyesi: profile.role.toLowerCase(),
        aktif: true,
        created_at: profile.user?.createdAt || new Date()
      }
    })

    // Sort to put super admin (admin@ozdilek) at the top
    transformedProfiles.sort((a, b) => {
      if (a.email === 'admin@ozdilek') return -1
      if (b.email === 'admin@ozdilek') return 1
      return 0
    })

    return NextResponse.json(transformedProfiles)
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ad, soyad, email, yetki_seviyesi, password } = await request.json()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Bu email adresi zaten kullanılıyor' }, { status: 400 })
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password || 'defaultPassword123', 10)
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    // Create admin profile
    await prisma.adminProfile.create({
      data: {
        name: `${ad} ${soyad}`,
        email,
        role: yetki_seviyesi.toUpperCase(),
        userId: user.id
      }
    })

    return NextResponse.json({ message: 'Admin kullanıcı başarıyla oluşturuldu' })
  } catch (error) {
    console.error('Error creating admin user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, ad, soyad, email, yetki_seviyesi, aktif, password } = await request.json()

    // Get admin profile to check if it's admin@ozdilek
    const adminProfile = await prisma.adminProfile.findUnique({
      where: { id: userId }
    })

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin kullanıcı bulunamadı' }, { status: 404 })
    }

    // Protect admin@ozdilek from role and status changes, but allow name changes
    if (adminProfile.email === 'admin@ozdilek') {
      // Allow name and password updates for admin@ozdilek
      const updateData: any = {}
      
      if (ad && soyad) {
        updateData.name = `${ad} ${soyad}`
      }
      
      // Update admin profile name if provided
      if (updateData.name) {
        await prisma.adminProfile.update({
          where: { id: userId },
          data: updateData
        })
      }
      
      // Update password if provided
      if (password) {
        if (adminProfile.userId) {
          const hashedPassword = await bcrypt.hash(password, 10)
          await prisma.user.update({
            where: { id: adminProfile.userId },
            data: { password: hashedPassword }
          })
        }
      }
      
      // Block role, status and email changes
      if (yetki_seviyesi !== undefined || aktif !== undefined || email !== undefined) {
        return NextResponse.json({ error: 'Koordinatör Müdür Yardımcısı email, yetki seviyesi ve aktif durumu değiştirilemez. Güvenlik koruması aktif.' }, { status: 403 })
      }
      
      return NextResponse.json({ message: 'Koordinatör Müdür Yardımcısı başarıyla güncellendi' })
    }

    // Check for email conflicts if email is being updated
    if (email && email !== adminProfile.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })
      
      if (existingUser) {
        return NextResponse.json({ error: 'Bu email adresi zaten kullanılıyor' }, { status: 400 })
      }
    }

    // Update admin profile for other users
    const updateData: any = {
      name: `${ad} ${soyad}`,
      role: yetki_seviyesi?.toUpperCase()
    }
    
    if (email) {
      updateData.email = email
    }
    
    await prisma.adminProfile.update({
      where: { id: userId },
      data: updateData
    })

    // Update email in user table if provided
    if (email && adminProfile.userId) {
      await prisma.user.update({
        where: { id: adminProfile.userId },
        data: { email }
      })
    }

    // Update password if provided
    if (password) {
      if (adminProfile?.userId) {
        const hashedPassword = await bcrypt.hash(password, 10)
        await prisma.user.update({
          where: { id: adminProfile.userId },
          data: { password: hashedPassword }
        })
      }
    }

    return NextResponse.json({ message: 'Admin kullanıcı başarıyla güncellendi' })
  } catch (error) {
    console.error('Error updating admin user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await request.json()

    // Get admin profile to find user ID
    const adminProfile = await prisma.adminProfile.findUnique({
      where: { id: userId }
    })

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin kullanıcı bulunamadı' }, { status: 404 })
    }

    // Protect admin@ozdilek from deletion
    if (adminProfile.email === 'admin@ozdilek') {
      return NextResponse.json({ error: 'Koordinatör Müdür Yardımcısı silinemez. Güvenlik koruması aktif.' }, { status: 403 })
    }

    // Delete admin profile first
    await prisma.adminProfile.delete({
      where: { id: userId }
    })

    // Delete user
    if (adminProfile.userId) {
      await prisma.user.delete({
        where: { id: adminProfile.userId }
      })
    }

    return NextResponse.json({ message: 'Admin kullanıcı başarıyla silindi' })
  } catch (error) {
    console.error('Error deleting admin user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}