import { NextRequest, NextResponse } from 'next/server'
import { getStudentHistory } from '@/lib/temporal-queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = id

    if (!studentId) {
      return NextResponse.json(
        { error: 'Öğrenci ID gereklidir' },
        { status: 400 }
      )
    }

    // Get student history
    const history = await getStudentHistory(studentId)

    // Format history for frontend
    const formattedHistory = history.map((record: any) => ({
      id: record.id,
      changeType: record.changeType,
      fieldName: record.fieldName,
      previousValue: record.previousValue ? JSON.parse(record.previousValue) : null,
      newValue: record.newValue ? JSON.parse(record.newValue) : null,
      validFrom: record.validFrom,
      validTo: record.validTo,
      reason: record.reason,
      notes: record.notes,
      changedBy: record.changedByUser?.adminProfile?.name || record.changedByUser?.email || 'Sistem',
      changedAt: record.validFrom
    }))

    return NextResponse.json({
      success: true,
      history: formattedHistory
    })

  } catch (error) {
    console.error('Student history API error:', error)
    return NextResponse.json(
      { error: 'Öğrenci geçmişi alınırken hata oluştu' },
      { status: 500 }
    )
  }
}