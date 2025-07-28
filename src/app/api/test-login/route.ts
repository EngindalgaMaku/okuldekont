import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🔍 Test login request:', { email })
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { adminProfile: true }
    })
    
    if (!user) {
      console.log('❌ User not found:', email)
      return NextResponse.json({ success: false, error: 'User not found' })
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password)
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email)
      return NextResponse.json({ success: false, error: 'Invalid password' })
    }
    
    console.log('✅ Login successful for:', email, 'Role:', user.role)
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.adminProfile
      }
    })
    
  } catch (error) {
    console.error('❌ Test login error:', error)
    return NextResponse.json({ success: false, error: 'Server error' })
  }
}