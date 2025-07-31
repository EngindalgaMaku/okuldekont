import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Temporal enum types (until Prisma client is regenerated)
type CompanyChangeType = 'MASTER_TEACHER_UPDATE' | 'BANK_ACCOUNT_UPDATE' | 'EMPLOYEE_COUNT_UPDATE' | 'CONTACT_INFO_UPDATE' | 'ADDRESS_UPDATE' | 'ACTIVITY_FIELD_UPDATE' | 'OTHER_UPDATE';

// GET - İşletme geçmiş kayıtlarını listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
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
      const total = await prisma.companyHistory.count();
      const recent = await prisma.companyHistory.count({
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
    
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    if (fieldName) {
      whereClause.fieldName = fieldName;
    }
    
    if (changeType) {
      whereClause.changeType = changeType as CompanyChangeType;
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
          company: {
            name: { contains: search, mode: 'insensitive' }
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

    const [companyHistory, totalCount] = await Promise.all([
      prisma.companyHistory.findMany({
        where: whereClause,
        include: {
          company: {
            select: {
              id: true,
              name: true,
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
      prisma.companyHistory.count({ where: whereClause })
    ]);

    // Response formatını CompanyHistoryModal'ın beklediği format ile uyumlu hale getir
    const formattedHistory = companyHistory.map((record: any) => ({
      id: record.id,
      companyId: record.companyId,
      changeType: record.changeType,
      fieldName: record.fieldName,
      previousValue: record.previousValue,
      newValue: record.newValue,
      validFrom: record.validFrom.toISOString(),
      validTo: record.validTo?.toISOString() || null,
      changedBy: record.changedByUser?.adminProfile?.name || record.changedByUser?.email || 'Bilinmiyor',
      reason: record.reason,
      createdAt: record.validFrom.toISOString()
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
    console.error('Company history fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'İşletme geçmiş kayıtları getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni işletme geçmiş kaydı oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      changeType,
      fieldName,
      previousValue,
      newValue,
      changedBy,
      reason,
      notes
    } = body;

    // Aynı alan için önceki kaydın validTo'sunu güncelle
    const previousRecord = await prisma.companyHistory.findFirst({
      where: {
        companyId,
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
        await tx.companyHistory.update({
          where: { id: previousRecord.id },
          data: { validTo: now }
        });
      }

      // Yeni kayıt oluştur
      const newRecord = await tx.companyHistory.create({
        data: {
          companyId,
          changeType: changeType as CompanyChangeType,
          fieldName,
          previousValue: previousValue ? JSON.stringify(previousValue) : null,
          newValue: newValue ? JSON.stringify(newValue) : null,
          validFrom: now,
          changedBy,
          reason,
          notes
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
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
      message: 'İşletme geçmiş kaydı başarıyla oluşturuldu'
    });

  } catch (error) {
    console.error('Company history creation error:', error);
    return NextResponse.json(
      { success: false, error: 'İşletme geçmiş kaydı oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}