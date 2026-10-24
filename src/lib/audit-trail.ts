import { prisma } from '@/lib/prisma';

export interface AuditTrailData {
  internshipId: string;
  action: string; // Will match InternshipAction enum values
  previousData?: any;
  newData?: any;
  performedBy: string;
  reason?: string;
  notes?: string;
}

export async function createAuditTrailEntry(data: AuditTrailData) {
  try {
    // Use Prisma client for consistency
    const result = await prisma.internshipHistory.create({
      data: {
        internshipId: data.internshipId,
        action: data.action as any, // Cast to handle enum
        previousData: data.previousData || null,
        newData: data.newData || null,
        performedBy: data.performedBy,
        reason: data.reason || null,
        notes: data.notes || null
      }
    });

    return { success: true, result };
  } catch (error) {
    console.error('Audit trail creation error:', error);
    return { success: false, error };
  }
}

export async function getInternshipAuditTrail(internshipId: string) {
  try {
    // Use Prisma client for consistency and better type safety
    const history = await prisma.internshipHistory.findMany({
      where: {
        internshipId: internshipId
      },
      include: {
        performer: {
          include: {
            adminProfile: true,
            teacherProfile: true
          }
        }
      },
      orderBy: {
        performedAt: 'desc'
      }
    });

    return history.map(record => ({
      id: record.id,
      action: record.action,
      performedAt: record.performedAt,
      performedBy: record.performedBy,
      performerEmail: record.performer.email,
      performerName: record.performer.teacherProfile
        ? `${record.performer.teacherProfile.name} ${record.performer.teacherProfile.surname}`
        : record.performer.adminProfile?.name || 'System Admin',
      reason: record.reason,
      notes: record.notes,
      previousData: record.previousData,
      newData: record.newData
    }));
  } catch (error) {
    console.error('Get audit trail error:', error);
    return [];
  }
}

export async function getStudentInternshipHistory(studentId: string) {
  try {
    // Use Prisma client instead of raw SQL for better compatibility
    const history = await prisma.internshipHistory.findMany({
      where: {
        internship: {
          studentId: studentId
        }
      },
      include: {
        internship: {
          include: {
            company: true,
            teacher: true,
            educationYear: true
          }
        },
        performer: {
          include: {
            adminProfile: true,
            teacherProfile: true
          }
        }
      },
      orderBy: {
        performedAt: 'desc'
      }
    });

    return history.map(record => ({
      id: record.id,
      action: record.action,
      performedAt: record.performedAt,
      performedBy: record.performedBy,
      internshipId: record.internshipId,
      companyName: record.internship.company.name,
      teacherName: record.internship.teacher
        ? `${record.internship.teacher.name} ${record.internship.teacher.surname}`
        : null,
      educationYear: record.internship.educationYear.year,
      performerName: record.performer.teacherProfile
        ? `${record.performer.teacherProfile.name} ${record.performer.teacherProfile.surname}`
        : record.performer.adminProfile?.name || 'System Admin',
      reason: record.reason,
      notes: record.notes,
      previousData: record.previousData,
      newData: record.newData
    }));
  } catch (error) {
    console.error('Get student history error:', error);
    return [];
  }
}

// Removed generateId function as Prisma handles ID generation with @default(cuid())

// Utility functions for common audit trail actions
export const auditActions = {
  CREATED: 'CREATED',
  ASSIGNED: 'ASSIGNED', 
  COMPANY_CHANGED: 'COMPANY_CHANGED',
  TEACHER_CHANGED: 'TEACHER_CHANGED',
  TERMINATED: 'TERMINATED',
  REACTIVATED: 'REACTIVATED',
  COMPLETED: 'COMPLETED',
  UPDATED: 'UPDATED'
} as const;

export async function auditInternshipCreation(
  internshipId: string,
  internshipData: any,
  performedBy: string
) {
  return createAuditTrailEntry({
    internshipId,
    action: auditActions.CREATED,
    newData: internshipData,
    performedBy,
    reason: 'Yeni staj kaydı oluşturuldu'
  });
}

export async function auditInternshipTermination(
  internshipId: string,
  previousData: any,
  newData: any,
  performedBy: string,
  reason: string,
  notes?: string
) {
  return createAuditTrailEntry({
    internshipId,
    action: auditActions.TERMINATED,
    previousData,
    newData,
    performedBy,
    reason,
    notes
  });
}

export async function auditInternshipAssignment(
  internshipId: string,
  previousData: any,
  newData: any,
  performedBy: string,
  reason: string
) {
  return createAuditTrailEntry({
    internshipId,
    action: auditActions.ASSIGNED,
    previousData,
    newData,
    performedBy,
    reason
  });
}