import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug session request')
    
    // Get session
    const session = await getServerSession(authOptions)
    console.log('📋 Session:', JSON.stringify(session, null, 2))
    
    // Get JWT token
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    console.log('🎫 JWT Token:', JSON.stringify(token, null, 2))
    
    return NextResponse.json({ 
      session,
      token,
      hasSession: !!session,
      hasToken: !!token,
      userRole: session?.user?.role,
      tokenRole: token?.role
    })
    
  } catch (error: any) {
    console.error('❌ Debug session error:', error)
    return NextResponse.json({ error: 'Debug error', details: error?.message || 'Unknown error' })
  }
}