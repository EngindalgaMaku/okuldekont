import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const startTime = performance.now()
    
    // Simple health check - try to get one record from a basic table
    await prisma.systemSetting.findFirst({
      select: { id: true },
      take: 1
    })
    
    const endTime = performance.now()
    const responseTime = Math.round(endTime - startTime)
    
    return NextResponse.json({
      status: 'connected',
      latency: responseTime,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database health check failed:', error)
    return NextResponse.json(
      {
        status: 'disconnected',
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}