import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to calculate internship days from weekly schedule
function calculateInternshipDays(haftalikProgram: any): number {
  if (!haftalikProgram || typeof haftalikProgram !== "object") {
    return 3; // Default value
  }

  try {
    const dayKeys = ["pazartesi", "sali", "carsamba", "persembe", "cuma"];

    // Count days where value is 'isletme' (internship)
    const internshipDaysCount = dayKeys.filter(
      (dayKey) => haftalikProgram[dayKey] === "isletme"
    ).length;

    return internshipDaysCount || 3; // Default to 3 if no internship days found
  } catch (error) {
    console.error("Haftalık program parse hatası:", error);
    return 3; // Default value on error
  }
}

// Helper function to get internship day names from weekly schedule
function getInternshipDayNames(haftalikProgram: any): string {
  if (!haftalikProgram || typeof haftalikProgram !== "object") {
    return "Pzt, Çar, Cum"; // Default value
  }

  try {
    const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum"];
    const dayKeys = ["pazartesi", "sali", "carsamba", "persembe", "cuma"];

    const internshipDays: string[] = [];

    // Check each day for internship ('isletme' means internship)
    dayKeys.forEach((dayKey, index) => {
      const daySchedule = haftalikProgram[dayKey];
      if (daySchedule === "isletme") {
        internshipDays.push(dayNames[index]);
      }
    });

    return internshipDays.length > 0
      ? internshipDays.join(", ")
      : "Pzt, Çar, Cum";
  } catch (error) {
    console.error("Haftalık program parse hatası:", error);
    return "Pzt, Çar, Cum"; // Default value on error
  }
}

// Helper function to calculate student wage based on actual start date
function calculateStudentWage(
  month: number,
  year: number,
  startDate?: Date,
  absentDays: number = 0,
  dailyRate: number = 221.0466,
  userWorkingDays?: number
) {
  // Ayın ilk ve son günü
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // KRITIK KONTROL: Eğer staj başlangıç tarihi seçilen aydan sonraysa, o ay hiç ücret yok
  if (startDate && startDate > monthEnd) {
    return {
      working_days: 0,
      absent_days: 0,
      holiday_days: 0,
      daily_rate: dailyRate,
      calculated_amount: 0,
    };
  }

  let workingDays = 0;

  // Eğer kullanıcı working_days girmiş ise onu kullan, yoksa otomatik hesapla
  if (userWorkingDays !== undefined) {
    workingDays = userWorkingDays;
  } else {
    // Staj başlangıç tarihi ayın içindeyse onu kullan, değilse ayın başını kullan
    let effectiveStartDate = monthStart;
    if (startDate && startDate > monthStart && startDate <= monthEnd) {
      effectiveStartDate = startDate;
    }

    // Hesaplama başlangıcından ayın sonuna kadar olan iş günlerini say
    const currentDate = new Date(effectiveStartDate);

    while (currentDate <= monthEnd) {
      const dayOfWeek = currentDate.getDay();
      // Pazartesi=1, Salı=2, ... Cuma=5 (Cumartesi=6, Pazar=0)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Sadece çalıştığı gün sayısıyla günlük ücreti çarp (devamsızlık hesaba katılmaz)
  const calculatedAmount = workingDays * dailyRate;

  return {
    working_days: workingDays,
    absent_days: absentDays,
    holiday_days: 0, // Şimdilik 0, gerekirse holiday tablosundan çekilebilir
    daily_rate: dailyRate,
    calculated_amount: calculatedAmount,
  };
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { studentId, month, year, working_days, absent_days } = body;

    // Validation
    if (!studentId || !month || !year) {
      return NextResponse.json(
        { error: "Öğrenci ID, ay ve yıl parametreleri gerekli" },
        { status: 400 }
      );
    }

    if (working_days !== undefined && (working_days < 0 || working_days > 31)) {
      return NextResponse.json(
        { error: "Devam günü 0-31 arasında olmalıdır" },
        { status: 400 }
      );
    }

    if (absent_days !== undefined && (absent_days < 0 || absent_days > 31)) {
      return NextResponse.json(
        { error: "Devamsızlık günü 0-31 arasında olmalıdır" },
        { status: 400 }
      );
    }

    // Sistem ayarlarından günlük ücret oranını oku
    let dailyRate = 221.0466; // Default değer
    try {
      const dailyRateSetting = await prisma.systemSetting.findUnique({
        where: { key: "daily_rate" },
      });

      if (dailyRateSetting) {
        dailyRate = parseFloat(dailyRateSetting.value);
      }
    } catch (settingError) {
      console.error("Günlük ücret ayarı okuma hatası:", settingError);
    }

    // Öğrenciyi bul
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        stajlar: {
          where: { status: "ACTIVE" },
          select: { startDate: true },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Öğrenci bulunamadı" },
        { status: 404 }
      );
    }

    // Aktif staj tarihini al
    const activeInternship = student.stajlar[0];
    const startDate = activeInternship?.startDate;

    // Yeni maaş hesaplaması yap - kullanıcı girişi varsa onu kullan
    const wageCalculation = calculateStudentWage(
      month,
      year,
      startDate,
      absent_days || 0,
      dailyRate,
      working_days // userWorkingDays parametresi
    );

    // Bu öğrenci için attendance kaydı olup olmadığını kontrol et
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: studentId,
        month: month,
        year: year,
      },
    });

    let updatedAttendance;
    if (existingAttendance) {
      // Mevcut kaydı güncelle
      updatedAttendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          totalDays:
            working_days !== undefined
              ? working_days
              : existingAttendance.totalDays,
          absentDays:
            absent_days !== undefined
              ? absent_days
              : existingAttendance.absentDays,
          updatedAt: new Date(),
        },
      });
    } else {
      // Yeni kayıt oluştur
      updatedAttendance = await prisma.attendance.create({
        data: {
          studentId: studentId,
          month: month,
          year: year,
          totalDays: working_days || wageCalculation.working_days,
          absentDays: absent_days || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Güncellenmiş hesaplama - kullanıcının girdiği working_days değerini kullan
    const finalWageCalculation = calculateStudentWage(
      month,
      year,
      startDate,
      updatedAttendance.absentDays,
      dailyRate,
      updatedAttendance.totalDays // userWorkingDays parametresi
    );

    return NextResponse.json({
      success: true,
      data: {
        working_days: updatedAttendance.totalDays,
        absent_days: updatedAttendance.absentDays,
        calculated_amount: finalWageCalculation.calculated_amount,
        daily_rate: dailyRate,
      },
    });
  } catch (error) {
    console.error("Devam güncelleştime hatası:", error);
    return NextResponse.json(
      { error: "Güncelleme işleminde hata oluştu" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ay = searchParams.get("ay");
    const yil = searchParams.get("yil");
    const ogretmen = searchParams.get("ogretmen");
    const alan = searchParams.get("alan");

    // Validate required parameters
    if (!ay || !yil || !ogretmen) {
      return NextResponse.json(
        { error: "Ay, yıl ve öğretmen parametreleri gerekli" },
        { status: 400 }
      );
    }

    const selectedYear = parseInt(yil);
    const selectedMonth = parseInt(ay);

    // Sistem ayarlarından günlük ücret oranını oku
    let dailyRate = 221.0466; // Default değer
    try {
      const dailyRateSetting = await prisma.systemSetting.findUnique({
        where: { key: "daily_rate" },
      });

      if (dailyRateSetting) {
        dailyRate = parseFloat(dailyRateSetting.value);
      } else {
        // Eğer ayar yoksa default değeri kaydet
        await prisma.systemSetting.create({
          data: {
            key: "daily_rate",
            value: dailyRate.toString(),
          },
        });
      }
    } catch (settingError) {
      console.error("Günlük ücret ayarı okuma hatası:", settingError);
      // Default değer kullanmaya devam et
    }

    console.log("🔍 Debug başlıyor...");
    console.log("Gelen parametreler:", { ay, yil, ogretmen, alan });
    console.log("💰 Günlük ücret oranı:", dailyRate);

    // Önce seçilen öğretmeni bul
    const ogretmenParts = ogretmen.trim().split(" ");
    const firstName = ogretmenParts[0] || "";
    const lastName = ogretmenParts.slice(1).join(" ") || "";

    console.log("👤 Öğretmen aranıyor:", { firstName, lastName });

    const selectedTeacher = await prisma.teacherProfile.findFirst({
      where: {
        AND: [
          { name: { contains: firstName } },
          { surname: { contains: lastName } },
        ],
      },
    });

    console.log("👤 Bulunan öğretmen:", selectedTeacher);

    if (!selectedTeacher) {
      return NextResponse.json({
        data: [],
        message: "Seçilen öğretmen bulunamadı",
        debug: { firstName, lastName },
      });
    }

    // Önce bu öğretmenin tüm ilişkilerini kontrol edelim
    console.log("🔍 Öğretmenin ilişkileri kontrol ediliyor...");

    // 1. Bu öğretmenin koordinatörü olduğu işletmeler
    const koordinatorOlduguIsletmeler = await prisma.companyProfile.findMany({
      where: {
        teacherId: selectedTeacher.id,
      },
      select: {
        id: true,
        name: true,
      },
    });
    console.log(
      "🏢 Koordinatör olduğu işletmeler:",
      koordinatorOlduguIsletmeler
    );

    // 2. Bu öğretmenin staj koordinatörü olduğu stajlar
    const koordinatorOlduguStajlar = await prisma.staj.findMany({
      where: {
        teacherId: selectedTeacher.id,
        status: "ACTIVE",
      },
      select: {
        id: true,
        studentId: true,
        student: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });
    console.log("📚 Koordinatör olduğu stajlar:", koordinatorOlduguStajlar);

    // 3. Debug için önce alan filtresi olmadan öğrencileri getir
    console.log("🔍 Alan filtresi:", alan);

    const ogrencilerDebug = await prisma.student.findMany({
      where: {
        // Sadece bu öğretmenin STAJ koordinatörü olduğu öğrenciler
        stajlar: {
          some: {
            teacherId: selectedTeacher.id,
            status: "ACTIVE",
          },
        },
      },
      select: {
        id: true,
        name: true,
        surname: true,
        alanId: true,
        alan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(
      "🔍 Alan filtresi olmadan bulunan öğrenciler:",
      ogrencilerDebug
    );

    // 4. Alan filtresini kaldır - sadece öğretmenin koordinatör olduğu öğrencileri getir
    const ogrenciler = await prisma.student.findMany({
      where: {
        // Alan filtresi kaldırıldı - çünkü öğretmen seçimi zaten alan bazında yapılıyor
        // Sadece bu öğretmenin STAJ koordinatörü olduğu öğrenciler
        stajlar: {
          some: {
            teacherId: selectedTeacher.id,
            status: "ACTIVE",
          },
        },
      },
      include: {
        alan: {
          select: {
            name: true,
          },
        },
        class: {
          select: {
            name: true,
            dal: true,
            haftalik_program: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
        stajlar: {
          where: {
            status: "ACTIVE",
          },
          include: {
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ className: "asc" }, { number: "asc" }],
    });

    console.log("👥 Bulunan öğrenciler:", ogrenciler.length);
    console.log(
      "👥 Öğrenci detayları:",
      ogrenciler.map((o: any) => ({
        id: o.id,
        name: o.name + " " + o.surname,
        alanId: o.alanId,
        companyId: o.companyId,
        stajlar: o.stajlar.length,
      }))
    );

    // Attendance verilerini de çek
    const attendanceMap = new Map();
    for (const ogrenci of ogrenciler) {
      const attendance = await prisma.attendance.findFirst({
        where: {
          studentId: ogrenci.id,
          month: selectedMonth,
          year: selectedYear,
        },
      });
      if (attendance) {
        attendanceMap.set(ogrenci.id, attendance);
      }
    }

    // Format data for the report with wage calculations
    let formattedData = ogrenciler.map((ogrenci: any) => {
      // Bu öğrencinin aktif stajını al
      const aktifStaj = ogrenci.stajlar[0]; // İlk aktif staj

      const koordinatorOgretmen = ogretmen; // Seçilen öğretmen
      const ogrenciAd = `${ogrenci.name} ${ogrenci.surname}`;

      // İşletme adını bul - önce company, sonra aktif staj'dan
      const isletmeAd =
        ogrenci.company?.name || aktifStaj?.company?.name || "Bilinmiyor";

      // Alan ve dal bilgisini birleştir
      const alanAdi = ogrenci?.alan?.name || "Elektrik Elektronik";
      const dalAdi = ogrenci?.class?.dal;
      const bolumDal = dalAdi ? `${alanAdi} - ${dalAdi}` : alanAdi;

      // Calculate internship days from weekly schedule
      const haftalikProgram = ogrenci?.class?.haftalik_program;
      const stajGunu = calculateInternshipDays(haftalikProgram);
      const stajGunleri = getInternshipDayNames(haftalikProgram);

      console.log(`🔍 Öğrenci: ${ogrenci.name} ${ogrenci.surname}`);
      console.log(`📅 Haftalık Program:`, haftalikProgram);
      console.log(`📊 Staj Günleri:`, stajGunleri);

      // Attendance verisini al
      const attendance = attendanceMap.get(ogrenci.id);
      const absentDays = attendance?.absentDays || 0;
      const totalDays = attendance?.totalDays;

      // Calculate wage for this student using actual start date
      const wageCalculation = calculateStudentWage(
        selectedMonth,
        selectedYear,
        aktifStaj?.startDate,
        absentDays,
        dailyRate
      );

      // Eğer attendance'da totalDays varsa onu kullan, yoksa hesaplananı kullan
      const finalWorkingDays =
        totalDays !== undefined ? totalDays : wageCalculation.working_days;

      return {
        id: ogrenci.id,
        ogrenci_no: ogrenci.number || "",
        ogrenci_sinif: ogrenci.className || "",
        staj_gunu: stajGunu,
        staj_gunleri: stajGunleri,
        alan_adi: bolumDal,
        ogrenci_ad: ogrenciAd,
        koordinator_ogretmen: koordinatorOgretmen,
        isletme_ad: isletmeAd,
        dosya_url: null, // Henüz dekont yüklenmemiş
        miktar: 0, // Henüz ödeme yapılmamış
        calculated_amount: wageCalculation.calculated_amount,
        working_days: finalWorkingDays,
        absent_days: absentDays,
        holiday_days: wageCalculation.holiday_days,
        daily_rate: wageCalculation.daily_rate,
        onay_durumu: "", // Boş bırak
        ay: selectedMonth,
        yil: selectedYear,
        created_at: new Date().toISOString(),
      };
    });

    // Sort by student number for better presentation
    formattedData.sort((a: any, b: any) => {
      if (a.ogrenci_no && b.ogrenci_no) {
        return a.ogrenci_no.localeCompare(b.ogrenci_no);
      }
      return 0;
    });

    return NextResponse.json({
      data: formattedData,
      summary: {
        total: formattedData.length,
        onaylanan: 0, // Henüz dekont süreci başlamadı
        bekleyen: formattedData.length, // Tümü beklemede
        reddedilen: 0, // Henüz dekont süreci başlamadı
        toplam_tutar: formattedData.reduce(
          (sum: any, d: any) => sum + (d.calculated_amount || 0),
          0
        ),
      },
    });
  } catch (error) {
    console.error("Öğrenci ücret dökümü API hatası:", error);
    return NextResponse.json(
      { error: "Veri getirme işleminde hata oluştu" },
      { status: 500 }
    );
  }
}

// Toplu devamsızlık yükleme endpoint'i
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { attendanceData, month, year } = body;

    if (!Array.isArray(attendanceData) || !month || !year) {
      return NextResponse.json(
        {
          error:
            "Geçersiz veri formatı. attendanceData array, month ve year gerekli.",
        },
        { status: 400 }
      );
    }

    const selectedMonth = parseInt(month);
    const selectedYear = parseInt(year);

    // Sistem ayarlarından günlük ücret oranını al
    let dailyRate = 221.0466;
    try {
      const dailyRateSetting = await prisma.systemSetting.findUnique({
        where: { key: "daily_rate" },
      });
      if (dailyRateSetting) {
        dailyRate = parseFloat(dailyRateSetting.value);
      }
    } catch (settingError) {
      console.error("Günlük ücret ayarı okuma hatası:", settingError);
    }

    const results = [];
    const errors = [];
    let processed = 0;

    // Her bir attendance kaydını işle
    for (const record of attendanceData) {
      try {
        const { studentNumber, workingDays, absentDays } = record;

        if (!studentNumber) {
          errors.push(`Öğrenci numarası eksik: ${JSON.stringify(record)}`);
          continue;
        }

        // Öğrenciyi öğrenci numarasıyla bul
        const student = await prisma.student.findFirst({
          where: {
            number: studentNumber.toString(),
          },
          include: {
            stajlar: {
              where: { status: "ACTIVE" },
              select: { startDate: true },
            },
          },
        });

        if (!student) {
          errors.push(`Öğrenci bulunamadı: ${studentNumber}`);
          continue;
        }

        // Staj başlangıç tarihini al
        const activeInternship = student.stajlar[0];
        const startDate = activeInternship?.startDate;

        // Yeni maaş hesaplaması
        const wageCalculation = calculateStudentWage(
          selectedMonth,
          selectedYear,
          startDate,
          parseInt(absentDays) || 0,
          dailyRate
        );

        // Attendance kaydını güncelle veya oluştur
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            studentId: student.id,
            month: selectedMonth,
            year: selectedYear,
          },
        });

        let attendanceUpdate;
        if (existingAttendance) {
          attendanceUpdate = await prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
              totalDays: parseInt(workingDays) || wageCalculation.working_days,
              absentDays: parseInt(absentDays) || 0,
              updatedAt: new Date(),
            },
          });
        } else {
          attendanceUpdate = await prisma.attendance.create({
            data: {
              studentId: student.id,
              month: selectedMonth,
              year: selectedYear,
              totalDays: parseInt(workingDays) || wageCalculation.working_days,
              absentDays: parseInt(absentDays) || 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }

        // Son hesaplamayı yap - kullanıcının girdiği working_days değerini kullan
        const finalCalculation = calculateStudentWage(
          selectedMonth,
          selectedYear,
          startDate,
          attendanceUpdate.absentDays,
          dailyRate,
          attendanceUpdate.totalDays // Kullanıcının girdiği working_days değeri
        );

        results.push({
          studentId: student.id,
          studentNumber,
          workingDays: attendanceUpdate.totalDays,
          absentDays: attendanceUpdate.absentDays,
          calculatedAmount: finalCalculation.calculated_amount,
        });

        processed++;
      } catch (recordError) {
        console.error("Kayıt işleme hatası:", recordError);
        const errorMessage =
          recordError instanceof Error
            ? recordError.message
            : "Bilinmeyen hata";
        errors.push(
          `İşlem hatası - Öğrenci: ${record.studentNumber} - Hata: ${errorMessage}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed,
        total: attendanceData.length,
        results,
        errors,
      },
    });
  } catch (error) {
    console.error("Toplu devamsızlık güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}
