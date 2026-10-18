import { prisma } from '@/lib/prisma';

// Temporal data query helper functions

/**
 * Belirli bir tarihte işletmenin belirli bir alanının değerini getir
 * @param companyId İşletme ID'si
 * @param fieldName Alan adı (masterTeacherName, bankAccountNo, etc.)
 * @param date Tarih (varsayılan: şimdi)
 * @returns Belirtilen tarihteki değer
 */
export async function getCompanyFieldValueAtDate(
  companyId: string,
  fieldName: string,
  date: Date = new Date()
): Promise<string | null> {
  try {
    const history = await (prisma as any).companyHistory.findFirst({
      where: {
        companyId,
        fieldName,
        validFrom: { lte: date },
        OR: [
          { validTo: null },
          { validTo: { gte: date } }
        ]
      },
      orderBy: { validFrom: 'desc' }
    });

    if (history?.newValue) {
      try {
        return JSON.parse(history.newValue);
      } catch {
        return history.newValue;
      }
    }

    // Geçmiş kayıt yoksa mevcut değeri getir
    const company = await prisma.companyProfile.findUnique({
      where: { id: companyId }
    });

    return (company as any)?.[fieldName] || null;
  } catch (error) {
    console.error('Company field value query error:', error);
    return null;
  }
}

/**
 * İşletmenin tüm geçmiş değişikliklerini getir
 * @param companyId İşletme ID'si
 * @param fieldName Spesifik alan (opsiyonel)
 * @returns Geçmiş değişikliklerin listesi
 */
export async function getCompanyHistory(
  companyId: string,
  fieldName?: string
): Promise<any[]> {
  try {
    const whereClause: any = { companyId };
    if (fieldName) {
      whereClause.fieldName = fieldName;
    }

    return await (prisma as any).companyHistory.findMany({
      where: whereClause,
      include: {
        changedByUser: {
          select: {
            email: true,
            adminProfile: { select: { name: true } }
          }
        }
      },
      orderBy: { validFrom: 'desc' }
    });
  } catch (error) {
    console.error('Company history query error:', error);
    return [];
  }
}

/**
 * Belirli bir tarihte öğretmenin belirli bir alanının değerini getir
 * @param teacherId Öğretmen ID'si
 * @param fieldName Alan adı (name, alanId, position, etc.)
 * @param date Tarih (varsayılan: şimdi)
 * @returns Belirtilen tarihteki değer
 */
export async function getTeacherFieldValueAtDate(
  teacherId: string,
  fieldName: string,
  date: Date = new Date()
): Promise<string | null> {
  try {
    const history = await (prisma as any).teacherHistory.findFirst({
      where: {
        teacherId,
        fieldName,
        validFrom: { lte: date },
        OR: [
          { validTo: null },
          { validTo: { gte: date } }
        ]
      },
      orderBy: { validFrom: 'desc' }
    });

    if (history?.newValue) {
      try {
        return JSON.parse(history.newValue);
      } catch {
        return history.newValue;
      }
    }

    // Geçmiş kayıt yoksa mevcut değeri getir
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId }
    });

    return (teacher as any)?.[fieldName] || null;
  } catch (error) {
    console.error('Teacher field value query error:', error);
    return null;
  }
}

/**
 * Öğretmenin tüm geçmiş değişikliklerini getir
 * @param teacherId Öğretmen ID'si
 * @param fieldName Spesifik alan (opsiyonel)
 * @returns Geçmiş değişikliklerin listesi
 */
export async function getTeacherHistory(
  teacherId: string,
  fieldName?: string
): Promise<any[]> {
  try {
    const whereClause: any = { teacherId };
    if (fieldName) {
      whereClause.fieldName = fieldName;
    }

    return await (prisma as any).teacherHistory.findMany({
      where: whereClause,
      include: {
        changedByUser: {
          select: {
            email: true,
            adminProfile: { select: { name: true } }
          }
        }
      },
      orderBy: { validFrom: 'desc' }
    });
  } catch (error) {
    console.error('Teacher history query error:', error);
    return [];
  }
}

/**
 * Öğrencinin tüm kayıt geçmişini getir
 * @param studentId Öğrenci ID'si
 * @returns Öğrencinin dönemsel kayıt geçmişi
 */
export async function getStudentEnrollmentHistory(studentId: string): Promise<any[]> {
  try {
    return await (prisma as any).studentEnrollment.findMany({
      where: { studentId },
      include: {
        educationYear: {
          select: {
            year: true,
            startDate: true,
            endDate: true
          }
        },
        class: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { educationYear: { year: 'desc' } },
        { enrollmentDate: 'desc' }
      ]
    });
  } catch (error) {
    console.error('Student enrollment history query error:', error);
    return [];
  }
}

/**
 * Belirli bir eğitim yılında belirli sınıftaki öğrencileri getir
 * @param educationYearId Eğitim yılı ID'si
 * @param grade Sınıf (9, 10, 11, 12)
 * @param gradeType Sınıf türü ('NORMAL' veya 'MESEM')
 * @returns O dönemdeki öğrenciler
 */
export async function getStudentsInGradeByYear(
  educationYearId: string,
  grade: number,
  gradeType: 'NORMAL' | 'MESEM' = 'NORMAL'
): Promise<any[]> {
  try {
    return await (prisma as any).studentEnrollment.findMany({
      where: {
        educationYearId,
        grade,
        gradeType
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            tcNo: true
          }
        },
        educationYear: {
          select: {
            year: true
          }
        }
      },
      orderBy: [
        { className: 'asc' },
        { student: { name: 'asc' } }
      ]
    });
  } catch (error) {
    console.error('Students in grade query error:', error);
    return [];
  }
}

/**
 * Mezun olan öğrencileri getir
 * @param educationYearId Eğitim yılı (opsiyonel)
 * @param gradeType Sınıf türü (opsiyonel)
 * @returns Mezun öğrenciler
 */
export async function getGraduatedStudents(
  educationYearId?: string,
  gradeType?: 'NORMAL' | 'MESEM'
): Promise<any[]> {
  try {
    const whereClause: any = { status: 'GRADUATED' };
    
    if (educationYearId) {
      whereClause.educationYearId = educationYearId;
    }
    
    if (gradeType) {
      whereClause.gradeType = gradeType;
    }

    return await (prisma as any).studentEnrollment.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            tcNo: true
          }
        },
        educationYear: {
          select: {
            year: true
          }
        }
      },
      orderBy: [
        { graduationDate: 'desc' },
        { student: { name: 'asc' } }
      ]
    });
  } catch (error) {
    console.error('Graduated students query error:', error);
    return [];
  }
}

/**
 * Öğrencinin tüm geçmiş değişikliklerini getir
 * @param studentId Öğrenci ID'si
 * @param fieldName Spesifik alan (opsiyonel)
 * @returns Geçmiş değişikliklerin listesi
 */
export async function getStudentHistory(
  studentId: string,
  fieldName?: string
): Promise<any[]> {
  try {
    const whereClause: any = { studentId };
    if (fieldName) {
      whereClause.fieldName = fieldName;
    }

    return await (prisma as any).studentHistory.findMany({
      where: whereClause,
      include: {
        changedByUser: {
          select: {
            email: true,
            adminProfile: { select: { name: true } }
          }
        }
      },
      orderBy: { validFrom: 'desc' }
    });
  } catch (error) {
    console.error('Student history query error:', error);
    return [];
  }
}

/**
 * Temporal raporlama: Belirli tarih aralığındaki değişiklikleri getir
 * @param entityType 'company' veya 'teacher'
 * @param startDate Başlangıç tarihi
 * @param endDate Bitiş tarihi
 * @returns Tarih aralığındaki değişiklikler
 */
export async function getChangesInDateRange(
  entityType: 'company' | 'teacher',
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  try {
    const table = entityType === 'company' ? 'companyHistory' : 'teacherHistory';
    
    return await (prisma as any)[table].findMany({
      where: {
        validFrom: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        [entityType]: {
          select: {
            id: true,
            name: true,
            ...(entityType === 'teacher' && { surname: true })
          }
        },
        changedByUser: {
          select: {
            email: true,
            adminProfile: { select: { name: true } }
          }
        }
      },
      orderBy: { validFrom: 'desc' }
    });
  } catch (error) {
    console.error('Changes in date range query error:', error);
    return [];
  }
}