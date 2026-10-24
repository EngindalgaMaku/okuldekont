import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Temporal enum types (until Prisma client is regenerated)
type TeacherChangeType = 'PERSONAL_INFO_UPDATE' | 'CONTACT_INFO_UPDATE' | 'FIELD_ASSIGNMENT_UPDATE' | 'POSITION_UPDATE' | 'STATUS_UPDATE' | 'OTHER_UPDATE';

// GET - Öğretmen geçmiş kayıtlarını listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const fieldName = searchParams.get('fieldName');
    const changeType = searchParams.get('changeType');
    const validAt = searchParams.get('validAt'); // Belirli bir tarihte geçerli olan değerleri getir
    const stats = searchParams.get('stats'); // İstatistik modu
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // İstatistik modu
    if (stats === 'true') {
      const total = await (prisma as any).teacherHistory.count();
      const recent = await (prisma as any).teacherHistory.count({
        where: {
          validFrom: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Son 7 gün
          }
        }
      });

      return NextResponse.json({
        success: true,
        total,
        recent
      });
    }

    const whereClause: any = {};
    
    if (teacherId) {
      whereClause.teacherId = teacherId;
    }
    
    if (fieldName) {
      whereClause.fieldName = fieldName;
    }
    
    if (changeType) {
      whereClause.changeType = changeType as TeacherChangeType;
    }

    // Belirli bir tarihte geçerli olan değerleri filtrele
    if (validAt) {
      const dateFilter = new Date(validAt);
      whereClause.validFrom = { lte: dateFilter };
      whereClause.OR = [
        { validTo: null },
        { validTo: { gte: dateFilter } }
      ];
    }

    // Tarih aralığı filtresi
    if (startDate || endDate) {
      whereClause.validFrom = {};
      if (startDate) {
        whereClause.validFrom.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.validFrom.lte = new Date(endDate);
      }
    }

    // Arama filtresi
    if (search) {
      whereClause.OR = [
        {
          teacher: {
            name: { contains: search, mode: 'insensitive' }
          }
        },
        {
          teacher: {
            surname: { contains: search, mode: 'insensitive' }
          }
        },
        {
          reason: { contains: search, mode: 'insensitive' }
        },
        {
          notes: { contains: search, mode: 'insensitive' }
        }
      ];
    }

    const offset = (page - 1) * limit;

    const [teacherHistory, totalCount] = await Promise.all([
      (prisma as any).teacherHistory.findMany({
        where: whereClause,
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              surname: true,
            }
          },
          changedByUser: {
            select: {
              id: true,
              email: true,
              adminProfile: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: [
          { validFrom: 'desc' }
        ],
        skip: offset,
        take: limit
      }),
      (prisma as any).teacherHistory.count({ where: whereClause })
    ]);

    // Response formatını sayfaların beklediği format ile uyumlu hale getir
    const formattedHistory = teacherHistory.map((record: any) => ({
      id: record.id,
      teacher_id: record.teacherId,
      teacher_name: record.teacher ? `${record.teacher.name} ${record.teacher.surname}` : 'Bilinmiyor',
      change_type: record.changeType,
      changed_field: record.fieldName,
      old_value: record.previousValue,
      new_value: record.newValue,
      valid_from: record.validFrom,
      valid_to: record.validTo,
      description: record.reason || record.notes,
      changed_by: record.changedByUser?.adminProfile?.name || record.changedByUser?.email || 'Bilinmiyor',
      created_at: record.validFrom // Use validFrom as created_at for compatibility
    }));

    return NextResponse.json({
      success: true,
      history: formattedHistory,
      data: formattedHistory, // Backward compatibility
      count: formattedHistory.length,
      totalCount,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Teacher history fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Öğretmen geçmiş kayıtları getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni öğretmen geçmiş kaydı oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teacherId,
      changeType,
      fieldName,
      previousValue,
      newValue,
      changedBy,
      reason,
      notes
    } = body;

    // Aynı alan için önceki kaydın validTo'sunu güncelle
    const previousRecord = await (prisma as any).teacherHistory.findFirst({
      where: {
        teacherId,
        fieldName,
        validTo: null
      },
      orderBy: { validFrom: 'desc' }
    });

    const now = new Date();

    // Transaction ile güvenli güncelleme
    const result = await prisma.$transaction(async (tx) => {
      // Önceki kaydın validTo'sunu güncelle
      if (previousRecord) {
        await (tx as any).teacherHistory.update({
          where: { id: previousRecord.id },
          data: { validTo: now }
        });
      }

      // Yeni kayıt oluştur
      const newRecord = await (tx as any).teacherHistory.create({
        data: {
          teacherId,
          changeType: changeType as TeacherChangeType,
          fieldName,
          previousValue: previousValue ? JSON.stringify(previousValue) : null,
          newValue: newValue ? JSON.stringify(newValue) : null,
          validFrom: now,
          changedBy,
          reason,
          notes
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              surname: true,
            }
          },
          changedByUser: {
            select: {
              id: true,
              email: true,
              adminProfile: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      return newRecord;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Öğretmen geçmiş kaydı başarıyla oluşturuldu'
    });

  } catch (error) {
    console.error('Teacher history creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Öğretmen geçmiş kaydı oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}