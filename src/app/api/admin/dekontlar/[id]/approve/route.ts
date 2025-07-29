import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'
import { encryptFinancialData, decryptFinancialData, maskFinancialData } from '@/lib/encryption'
import { 
  ErrorHandler, 
  BusinessLogicError, 
  ValidationError, 
  DatabaseError,
  generateCorrelationId,
  logger,
  withPerformanceMonitoring
} from '@/lib/error-handling'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = generateCorrelationId()
  const startTime = Date.now()

  // Enhanced authentication with financial endpoint protection
  const authResult = await validateAuthAndRole(request, ['ADMIN'], { endpoint: 'financial' })
  if (!authResult.success) {
    // Log security event for failed financial operation access
    ErrorHandler.logSecurityEvent({
      eventType: 'authorization_failed',
      severity: 'MEDIUM' as any,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      endpoint: '/api/admin/dekontlar/[id]/approve',
      details: { error: authResult.error }
    }, correlationId)

    return ErrorHandler.handleError(
      authResult.status === 401 
        ? new Error('Authentication required')
        : new Error('Access denied'),
      correlationId
    )
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { decision, rejectReason } = body

    // Enhanced validation with proper error handling
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      throw new ValidationError(
        'Geçersiz karar. APPROVED veya REJECTED olmalı.',
        { decision, allowedValues: ['APPROVED', 'REJECTED'] },
        correlationId
      )
    }

    if (decision === 'REJECTED' && !rejectReason) {
      throw new ValidationError(
        'Red kararında neden belirtilmelidir.',
        { decision, rejectReason },
        correlationId
      )
    }

    // Get dekont with all related data - with error handling
    const dekont = await prisma.dekont.findUnique({
      where: { id },
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: true
              }
            },
            company: true
          }
        },
        teacher: true
      }
    }).catch(error => {
      logger.database('dekont_fetch_failed', { dekontId: id, error: error.message, correlationId })
      throw new DatabaseError(
        'Dekont verisi alınırken hata oluştu',
        { dekontId: id, originalError: error.message },
        correlationId
      )
    })

    if (!dekont) {
      throw new BusinessLogicError(
        'Dekont bulunamadı',
        { dekontId: id },
        correlationId
      )
    }

    if (dekont.status !== 'PENDING') {
      throw new BusinessLogicError(
        'Sadece beklemede olan dekontlar onaylanabilir/reddedilebilir',
        { 
          dekontId: id, 
          currentStatus: dekont.status, 
          allowedStatus: 'PENDING' 
        },
        correlationId
      )
    }

    // Update dekont status - with comprehensive logging
    logger.info(`🔒 FINANCIAL: Dekont ${decision.toLowerCase()} operation initiated`, {
      dekontId: id,
      decision,
      adminId: authResult.user?.id,
      adminEmail: authResult.user?.email,
      currentAmount: maskFinancialData(dekont.amount?.toString() || null),
      correlationId
    })

    const updatedDekont = await prisma.dekont.update({
      where: { id },
      data: {
        status: decision,
        rejectReason: decision === 'REJECTED' ? rejectReason : null,
        approvedAt: decision === 'APPROVED' ? new Date() : null,
        approvedBy: decision === 'APPROVED' ? authResult.user?.id : null
      },
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: true
              }
            },
            company: true
          }
        },
        teacher: true
      }
    }).catch(error => {
      logger.error(new DatabaseError(
        'Dekont status güncellenirken hata oluştu',
        { 
          dekontId: id, 
          decision, 
          originalError: error.message,
          adminId: authResult.user?.id 
        },
        correlationId
      ))
      throw error
    })

    // Comprehensive audit logging for financial decision
    logger.info(`✅ FINANCIAL: Dekont ${decision.toLowerCase()} completed successfully`, {
      dekontId: id,
      decision,
      adminId: authResult.user?.id,
      adminEmail: authResult.user?.email,
      studentName: updatedDekont.staj?.student ? `${updatedDekont.staj.student.name} ${updatedDekont.staj.student.surname}` : 'Unknown',
      companyName: updatedDekont.staj?.company?.name || 'Unknown',
      amount: maskFinancialData(updatedDekont.amount?.toString() || null),
      rejectReason: decision === 'REJECTED' ? rejectReason : null,
      correlationId,
      timestamp: new Date().toISOString()
    })

    // Log performance metrics
    const duration = Date.now() - startTime
    ErrorHandler.logPerformance({
      endpoint: '/api/admin/dekontlar/[id]/approve',
      method: 'POST',
      duration,
      statusCode: 200,
      userId: authResult.user?.id,
      userRole: authResult.user?.role
    }, correlationId)

    // Prepare response data with decrypted amount for admin view
    const responseData = {
      id: updatedDekont.id,
      status: updatedDekont.status,
      rejectReason: updatedDekont.rejectReason,
      approvedAt: updatedDekont.approvedAt,
      approvedBy: updatedDekont.approvedBy,
      amount: updatedDekont.amount ? Number(decryptFinancialData(updatedDekont.amount.toString())) : null,
      student: updatedDekont.staj?.student ? {
        name: updatedDekont.staj.student.name,
        surname: updatedDekont.staj.student.surname,
        className: updatedDekont.staj.student.className,
        number: updatedDekont.staj.student.number
      } : null,
      company: updatedDekont.staj?.company ? {
        name: updatedDekont.staj.company.name
      } : null,
      month: updatedDekont.month,
      year: updatedDekont.year,
      paymentDate: updatedDekont.paymentDate,
      correlationId
    }

    return NextResponse.json({
      success: true,
      message: `Dekont başarıyla ${decision === 'APPROVED' ? 'onaylandı' : 'reddedildi'}`,
      data: responseData
    })

  } catch (error) {
    // Log performance metrics for failed requests
    const duration = Date.now() - startTime
    ErrorHandler.logPerformance({
      endpoint: '/api/admin/dekontlar/[id]/approve',
      method: 'POST',
      duration,
      statusCode: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500,
      userId: authResult.user?.id,
      userRole: authResult.user?.role
    }, correlationId)

    // Handle the error using our centralized error handler
    return ErrorHandler.handleError(error as Error, correlationId)
  }
}