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
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to match expected format
    const transformedProfiles = adminProfiles.map((profile: any) => ({
      id: profile.id,
      ad: profile.name,
      soyad: profile.name.split(' ')[1] || '',
      email: profile.email,
      yetki_seviyesi: profile.role.toLowerCase(),
      aktif: true,
      created_at: profile.createdAt
    }))

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

    const { userId, ad, soyad, yetki_seviyesi, aktif, password } = await request.json()

    // Update admin profile
    await prisma.adminProfile.update({
      where: { id: userId },
      data: {
        name: `${ad} ${soyad}`,
        role: yetki_seviyesi?.toUpperCase()
      }
    })

    // Update password if provided
    if (password) {
      const adminProfile = await prisma.adminProfile.findUnique({
        where: { id: userId }
      })
      
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