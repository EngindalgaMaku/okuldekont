import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthAndRole } from "@/middleware/auth";
import { getActiveEducationYearId } from "@/lib/education-year";

export async function GET(request: NextRequest) {
  // Admin yetkisi kontrolü
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "1");
    const year = parseInt(searchParams.get("year") || "2024");

    // Aktif eğitim yılı ID'sini al
    const activeEducationYearId = await getActiveEducationYearId();

    // Tüm aktif stajları (sadece özel sektör işletmelerde) çek
    const stajlar = await prisma.staj.findMany({
      where: {
        archived: false,
        educationYearId: activeEducationYearId,
        company: {
          companyType: "PRIVATE", // Sadece özel sektör şirketleri
        },
      },
      include: {
        student: {
          include: {
            alan: {
              select: {
                name: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            contact: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
      },
    });

    // Belirtilen ay/yıl için dekontları çek
    const dekontlar = await prisma.dekont.findMany({
      where: {
        month: month,
        year: year,
        archived: false,
      },
      include: {
        staj: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            teacher: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
          },
        },
      },
    });

    // Öğretmen bazlı veri yapısı oluştur
    const teacherMap = new Map();

    // Tüm stajları işleyerek öğretmen-işletme ilişkilerini belirle
    stajlar.forEach((staj) => {
      if (!staj.teacher || !staj.company) return;

      const teacherId = staj.teacher.id;
      const teacherName = `${staj.teacher.name} ${staj.teacher.surname}`;
      const companyId = staj.company.id;
      const companyName = staj.company.name;

      // Öğretmen map'inde yoksa ekle
      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          ogretmen_id: teacherId,
          ogretmen_ad: teacherName,
          isletmeler: new Map(),
        });
      }

      const teacher = teacherMap.get(teacherId);

      // İşletme bu öğretmenin listesinde yoksa ekle
      if (!teacher.isletmeler.has(companyId)) {
        // Bu işletmede bu ay dekont gönderen öğrenci sayısını hesapla
        const companyDekontlar = dekontlar.filter(
          (dekont) =>
            dekont.staj?.company?.id === companyId &&
            dekont.staj?.teacher?.id === teacherId
        );

        // Bu işletmede staj yapan toplam öğrenci sayısını hesapla
        const companyStudents = stajlar.filter(
          (s) => s.companyId === companyId && s.teacherId === teacherId
        ).length;

        // Bu işletmede bu öğretmenin sorumlu olduğu öğrencileri çek
        const companyStudentList = stajlar
          .filter((s) => s.companyId === companyId && s.teacherId === teacherId)
          .map((s) => ({
            id: s.student.id,
            ad_soyad: `${s.student.name} ${s.student.surname}`,
            sinif: s.student.className,
            no: s.student.number,
            alan: s.student.alan?.name || "Bilinmiyor",
            has_dekont: companyDekontlar.some(
              (d) => d.staj?.student?.id === s.student.id
            ),
          }));

        teacher.isletmeler.set(companyId, {
          isletme_id: companyId,
          isletme_ad: companyName,
          has_dekont: companyDekontlar.length > 0,
          dekont_sayisi: companyDekontlar.length,
          toplam_ogrenci: companyStudents,
          ogrenciler: companyStudentList,
        });
      }
    });

    // Map'i array'e çevir
    const teachers = Array.from(teacherMap.values()).map((teacher) => ({
      ...teacher,
      isletmeler: Array.from(teacher.isletmeler.values()),
    }));

    // Boş işletme listesi olan öğretmenleri filtrele
    const filteredTeachers = teachers.filter(
      (teacher) => teacher.isletmeler.length > 0
    );

    return NextResponse.json({
      success: true,
      teachers: filteredTeachers,
      period: {
        month,
        year,
      },
      educationYearId: activeEducationYearId,
    });
  } catch (error) {
    console.error("Dekont status report error:", error);
    return NextResponse.json(
      { error: "Rapor verileri alınırken hata oluştu" },
      { status: 500 }
    );
  }
}
