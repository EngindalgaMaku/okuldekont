import { NextResponse } from 'next/server'
import { checkMaintenanceMode } from '@/lib/maintenance'

export async function GET() {
  try {
    const result = await checkMaintenanceMode()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Maintenance check API error:', error)
    return NextResponse.json(
      { isMaintenanceMode: false, error: 'Failed to check maintenance mode' },
      { status: 500 }
    )
  }
}