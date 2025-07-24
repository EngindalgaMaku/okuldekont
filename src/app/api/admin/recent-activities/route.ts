import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent dekont activities
    const recentDekonts = await prisma.dekont.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        rejectedAt: true,
        student: {
          select: {
            name: true,
            surname: true
          }
        },
        company: {
          select: {
            name: true
          }
        }
      }
    })

    // Get recent internship history
    const recentInternshipHistory = await prisma.internshipHistory.findMany({
      take: 5,
      orderBy: { performedAt: 'desc' },
      select: {
        id: true,
        action: true,
        performedAt: true,
        internship: {
          select: {
            student: {
              select: {
                name: true,
                surname: true
              }
            },
            company: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Get recent teacher assignments
    const recentTeacherAssignments = await prisma.teacherAssignmentHistory.findMany({
      take: 3,
      orderBy: { assignedAt: 'desc' },
      select: {
        id: true,
        assignedAt: true,
        company: {
          select: {
            name: true
          }
        },
        teacher: {
          select: {
            name: true,
            surname: true
          }
        }
      }
    })

    // Get recent document approvals
    const recentDocuments = await prisma.belge.findMany({
      take: 3,
      orderBy: { updatedAt: 'desc' },
      where: {
        status: {
          in: ['APPROVED', 'REJECTED']
        }
      },
      select: {
        id: true,
        ad: true,
        status: true,
        onaylanmaTarihi: true,
        updatedAt: true,
        teacher: {
          select: {
            name: true,
            surname: true
          }
        },
        company: {
          select: {
            name: true
          }
        }
      }
    })

    // Combine all activities and sort by date
    const allActivities: any[] = []

    // Add dekont activities
    recentDekonts.forEach(dekont => {
      const timeKey = dekont.approvedAt || dekont.rejectedAt || dekont.createdAt
      
      if (dekont.status === 'PENDING') {
        allActivities.push({
          id: `dekont_${dekont.id}`,
          type: 'dekont_pending',
          title: 'Yeni dekont bekleniyor',
          description: `${dekont.student.name} ${dekont.student.surname} - ${dekont.company.name}`,
          time: timeKey,
          icon: 'clock',
          color: 'yellow'
        })
      } else if (dekont.status === 'APPROVED') {
        allActivities.push({
          id: `dekont_${dekont.id}`,
          type: 'dekont_approved',
          title: 'Dekont onaylandı',
          description: `${dekont.student.name} ${dekont.student.surname} - ${dekont.company.name}`,
          time: timeKey,
          icon: 'check',
          color: 'green'
        })
      } else if (dekont.status === 'REJECTED') {
        allActivities.push({
          id: `dekont_${dekont.id}`,
          type: 'dekont_rejected',
          title: 'Dekont reddedildi',
          description: `${dekont.student.name} ${dekont.student.surname} - ${dekont.company.name}`,
          time: timeKey,
          icon: 'x',
          color: 'red'
        })
      }
    })

    // Add internship activities
    recentInternshipHistory.forEach(history => {
      let title = 'Staj güncellendi'
      let icon = 'clock'
      let color = 'blue'

      switch (history.action) {
        case 'CREATED':
          title = 'Yeni staj başlatıldı'
          icon = 'check'
          color = 'green'
          break
        case 'ASSIGNED':
          title = 'Staj atandı'
          icon = 'check'
          color = 'blue'
          break
        case 'COMPANY_CHANGED':
          title = 'İşletme değiştirildi'
          icon = 'clock'
          color = 'yellow'
          break
        case 'TEACHER_CHANGED':
          title = 'Öğretmen değiştirildi'
          icon = 'clock'
          color = 'yellow'
          break
        case 'TERMINATED':
          title = 'Staj sonlandırıldı'
          icon = 'x'
          color = 'red'
          break
      }

      allActivities.push({
        id: `internship_${history.id}`,
        type: `internship_${history.action.toLowerCase()}`,
        title,
        description: `${history.internship.student.name} ${history.internship.student.surname} - ${history.internship.company.name}`,
        time: history.performedAt,
        icon,
        color
      })
    })

    // Add teacher assignment activities
    recentTeacherAssignments.forEach(assignment => {
      allActivities.push({
        id: `teacher_${assignment.id}`,
        type: 'teacher_assigned',
        title: 'Öğretmen atandı',
        description: `${assignment.teacher?.name || 'Atama kaldırıldı'} ${assignment.teacher?.surname || ''} - ${assignment.company.name}`,
        time: assignment.assignedAt,
        icon: 'check',
        color: 'blue'
      })
    })

    // Add document activities
    recentDocuments.forEach(doc => {
      allActivities.push({
        id: `document_${doc.id}`,
        type: `document_${doc.status.toLowerCase()}`,
        title: doc.status === 'APPROVED' ? 'Belge onaylandı' : 'Belge reddedildi',
        description: `${doc.ad} - ${doc.teacher?.name || doc.company?.name}`,
        time: doc.onaylanmaTarihi || doc.updatedAt,
        icon: doc.status === 'APPROVED' ? 'check' : 'x',
        color: doc.status === 'APPROVED' ? 'green' : 'red'
      })
    })

    // Sort all activities by time (newest first) and take top 10
    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10)
      .map(activity => ({
        ...activity,
        time: formatTimeAgo(new Date(activity.time))
      }))

    return NextResponse.json(sortedActivities)
  } catch (error) {
    console.error('Recent activities API error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) {
    return 'Az önce'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} dakika önce`
  } else if (diffHours < 24) {
    return `${diffHours} saat önce`
  } else if (diffDays === 1) {
    return '1 gün önce'
  } else if (diffDays < 7) {
    return `${diffDays} gün önce`
  } else {
    return date.toLocaleDateString('tr-TR')
  }
}