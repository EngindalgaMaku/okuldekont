import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const startTime = Date.now()
    
    // Simple database query to check connection
    await prisma.$queryRaw`SELECT 1`
    
    const endTime = Date.now()
    const latency = endTime - startTime
    
    return NextResponse.json({
      status: 'connected',
      latency: latency,
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