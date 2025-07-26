import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to calculate internship days from weekly schedule
function calculateInternshipDays(haftalikProgram: any): number {
  if (!haftalikProgram || typeof haftalikProgram !== 'object') {
    return 3 // Default value
  }

  try {
    const dayKeys = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma']
    
    // Count days where value is 'isletme' (internship)
    const internshipDaysCount = dayKeys.filter(dayKey =>
      haftalikProgram[dayKey] === 'isletme'
    ).length
    
    return internshipDaysCount || 3 // Default to 3 if no internship days found
  } catch (error) {
    console.error('Haftalık program parse hatası:', error)
    return 3 // Default value on error
  }
}

// Helper function to get internship day names from weekly schedule
function getInternshipDayNames(haftalikProgram: any): string {
  if (!haftalikProgram || typeof haftalikProgram !== 'object') {
    return 'Pzt, Çar, Cum' // Default value
  }

  try {
    const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum']
    const dayKeys = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma']
    
    const internshipDays: string[] = []
    
    // Check each day for internship ('isletme' means internship)
    dayKeys.forEach((dayKey, index) => {
      const daySchedule = haftalikProgram[dayKey]
      if (daySchedule === 'isletme') {
        internshipDays.push(dayNames[index])
      }
    })
    
    return internshipDays.length > 0 ? internshipDays.join(', ') : 'Pzt, Çar, Cum'
  } catch (error) {
    console.error('Haftalık program parse hatası:', error)
    return 'Pzt, Çar, Cum' // Default value on error
  }
}

// Helper function to calculate student wage based on actual start date
function calculateStudentWage(month: number, year: number, startDate?: Date, absentDays: number = 0, dailyRate: number = 221.0466) {
  
  // Ayın ilk ve son günü
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)
  
  // KRITIK KONTROL: Eğer staj başlangıç tarihi seçilen aydan sonraysa, o ay hiç ücret yok
  if (startDate && startDate > monthEnd) {
    return {
      working_days: 0,
      absent_days: 0,
      holiday_days: 0,
      daily_rate: dailyRate,
      calculated_amount: 0
    }
  }
  
  // Staj başlangıç tarihi ayın içindeyse onu kullan, değilse ayın başını kullan
  let effectiveStartDate = monthStart
  if (startDate && startDate > monthStart && startDate <= monthEnd) {
    effectiveStartDate = startDate
  }
  
  // Hesaplama başlangıcından ayın sonuna kadar olan iş günlerini say
  let workingDays = 0
  const currentDate = new Date(effectiveStartDate)
  
  while (currentDate <= monthEnd) {
    const dayOfWeek = currentDate.getDay()
    // Pazartesi=1, Salı=2, ... Cuma=5 (Cumartesi=6, Pazar=0)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // Devamsızlık günlerini çıkar
  const effectiveWorkingDays = Math.max(0, workingDays - absentDays)
  const calculatedAmount = effectiveWorkingDays * dailyRate

  return {
    working_days: workingDays,
    absent_days: absentDays,
    holiday_days: 0, // Şimdilik 0, gerekirse holiday tablosundan çekilebilir
    daily_rate: dailyRate,
    calculated_amount: calculatedAmount
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ay = searchParams.get('ay')
    const yil = searchParams.get('yil')
    const ogretmen = searchParams.get('ogretmen')
    const alan = searchParams.get('alan')

    // Validate required parameters
    if (!ay || !yil || !ogretmen) {
      return NextResponse.json(
        { error: 'Ay, yıl ve öğretmen parametreleri gerekli' },
        { status: 400 }
      )
    }

    const selectedYear = parseInt(yil)
    const selectedMonth = parseInt(ay)

    // Sistem ayarlarından günlük ücret oranını oku
    let dailyRate = 221.0466 // Default değer
    try {
      const dailyRateSetting = await prisma.systemSetting.findUnique({
        where: { key: 'daily_rate' }
      })
      
      if (dailyRateSetting) {
        dailyRate = parseFloat(dailyRateSetting.value)
      } else {
        // Eğer ayar yoksa default değeri kaydet
        await prisma.systemSetting.create({
          data: {
            key: 'daily_rate',
            value: dailyRate.toString()
          }
        })
      }
    } catch (settingError) {
      console.error('Günlük ücret ayarı okuma hatası:', settingError)
      // Default değer kullanmaya devam et
    }

    console.log('🔍 Debug başlıyor...')
    console.log('Gelen parametreler:', { ay, yil, ogretmen, alan })
    console.log('💰 Günlük ücret oranı:', dailyRate)

    // Önce seçilen öğretmeni bul
    const ogretmenParts = ogretmen.trim().split(' ')
    const firstName = ogretmenParts[0] || ''
    const lastName = ogretmenParts.slice(1).join(' ') || ''

    console.log('👤 Öğretmen aranıyor:', { firstName, lastName })

    const selectedTeacher = await prisma.teacherProfile.findFirst({
      where: {
        AND: [
          { name: { contains: firstName } },
          { surname: { contains: lastName } }
        ]
      }
    })

    console.log('👤 Bulunan öğretmen:', selectedTeacher)

    if (!selectedTeacher) {
      return NextResponse.json({ 
        data: [],
        message: 'Seçilen öğretmen bulunamadı',
        debug: { firstName, lastName }
      })
    }

    // Önce bu öğretmenin tüm ilişkilerini kontrol edelim
    console.log('🔍 Öğretmenin ilişkileri kontrol ediliyor...')

    // 1. Bu öğretmenin koordinatörü olduğu işletmeler
    const koordinatorOlduguIsletmeler = await prisma.companyProfile.findMany({
      where: {
        teacherId: selectedTeacher.id
      },
      select: {
        id: true,
        name: true
      }
    })
    console.log('🏢 Koordinatör olduğu işletmeler:', koordinatorOlduguIsletmeler)

    // 2. Bu öğretmenin staj koordinatörü olduğu stajlar
    const koordinatorOlduguStajlar = await prisma.staj.findMany({
      where: {
        teacherId: selectedTeacher.id,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        studentId: true,
        student: {
          select: {
            name: true,
            surname: true
          }
        }
      }
    })
    console.log('📚 Koordinatör olduğu stajlar:', koordinatorOlduguStajlar)

    // 3. Debug için önce alan filtresi olmadan öğrencileri getir
    console.log('🔍 Alan filtresi:', alan)
    
    const ogrencilerDebug = await prisma.student.findMany({
      where: {
        // Sadece bu öğretmenin STAJ koordinatörü olduğu öğrenciler
        stajlar: {
          some: {
            teacherId: selectedTeacher.id,
            status: 'ACTIVE'
          }
        }
      },
      select: {
        id: true,
        name: true,
        surname: true,
        alanId: true,
        alan: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    console.log('🔍 Alan filtresi olmadan bulunan öğrenciler:', ogrencilerDebug)
    
    // 4. Alan filtresini kaldır - sadece öğretmenin koordinatör olduğu öğrencileri getir
    const ogrenciler = await prisma.student.findMany({
      where: {
        // Alan filtresi kaldırıldı - çünkü öğretmen seçimi zaten alan bazında yapılıyor
        // Sadece bu öğretmenin STAJ koordinatörü olduğu öğrenciler
        stajlar: {
          some: {
            teacherId: selectedTeacher.id,
            status: 'ACTIVE'
          }
        }
      },
      include: {
        alan: {
          select: {
            name: true
          }
        },
        class: {
          select: {
            name: true,
            dal: true,
            haftalik_program: true
          }
        },
        company: {
          select: {
            name: true
          }
        },
        stajlar: {
          where: {
            status: 'ACTIVE'
          },
          include: {
            company: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { className: 'asc' },
        { number: 'asc' }
      ]
    })

    console.log('👥 Bulunan öğrenciler:', ogrenciler.length)
    console.log('👥 Öğrenci detayları:', ogrenciler.map((o: any) => ({
      id: o.id,
      name: o.name + ' ' + o.surname,
      alanId: o.alanId,
      companyId: o.companyId,
      stajlar: o.stajlar.length
    })))

    // Format data for the report with wage calculations
    let formattedData = ogrenciler.map((ogrenci: any) => {
      // Bu öğrencinin aktif stajını al
      const aktifStaj = ogrenci.stajlar[0] // İlk aktif staj

      const koordinatorOgretmen = ogretmen // Seçilen öğretmen
      const ogrenciAd = `${ogrenci.name} ${ogrenci.surname}`
      
      // İşletme adını bul - önce company, sonra aktif staj'dan
      const isletmeAd = ogrenci.company?.name || aktifStaj?.company?.name || 'Bilinmiyor'
      
      // Alan ve dal bilgisini birleştir
      const alanAdi = ogrenci?.alan?.name || 'Elektrik Elektronik'
      const dalAdi = ogrenci?.class?.dal
      const bolumDal = dalAdi ? `${alanAdi} - ${dalAdi}` : alanAdi

      // Calculate internship days from weekly schedule
      const haftalikProgram = ogrenci?.class?.haftalik_program
      const stajGunu = calculateInternshipDays(haftalikProgram)
      const stajGunleri = getInternshipDayNames(haftalikProgram)
      
      console.log(`🔍 Öğrenci: ${ogrenci.name} ${ogrenci.surname}`)
      console.log(`📅 Haftalık Program:`, haftalikProgram)
      console.log(`📊 Staj Günleri:`, stajGunleri)

      // Get student's absence days for this month (if any)
      const absentDays = 0 // Şimdilik 0, gerekirse attendance tablosundan çekilebilir

      // Calculate wage for this student using actual start date
      const wageCalculation = calculateStudentWage(
        selectedMonth,
        selectedYear,
        aktifStaj?.startDate,
        absentDays,
        dailyRate
      )

      return {
        id: ogrenci.id,
        ogrenci_no: ogrenci.number || '',
        ogrenci_sinif: ogrenci.className || '',
        staj_gunu: stajGunu,
        staj_gunleri: stajGunleri,
        alan_adi: bolumDal,
        ogrenci_ad: ogrenciAd,
        koordinator_ogretmen: koordinatorOgretmen,
        isletme_ad: isletmeAd,
        dosya_url: null, // Henüz dekont yüklenmemiş
        miktar: 0, // Henüz ödeme yapılmamış
        calculated_amount: wageCalculation.calculated_amount,
        working_days: wageCalculation.working_days,
        absent_days: wageCalculation.absent_days,
        holiday_days: wageCalculation.holiday_days,
        daily_rate: wageCalculation.daily_rate,
        onay_durumu: '', // Boş bırak
        ay: selectedMonth,
        yil: selectedYear,
        created_at: new Date().toISOString()
      }
    })

    // Sort by student number for better presentation
    formattedData.sort((a, b) => {
      if (a.ogrenci_no && b.ogrenci_no) {
        return a.ogrenci_no.localeCompare(b.ogrenci_no)
      }
      return 0
    })

    return NextResponse.json({ 
      data: formattedData,
      summary: {
        total: formattedData.length,
        onaylanan: 0, // Henüz dekont süreci başlamadı
        bekleyen: formattedData.length, // Tümü beklemede
        reddedilen: 0, // Henüz dekont süreci başlamadı
        toplam_tutar: formattedData.reduce((sum, d) => sum + (d.calculated_amount || 0), 0)
      }
    })
  } catch (error) {
    console.error('Öğrenci ücret dökümü API hatası:', error)
    return NextResponse.json(
      { error: 'Veri getirme işleminde hata oluştu' },
      { status: 500 }
    )
  }
}