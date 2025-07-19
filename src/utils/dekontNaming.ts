/**
 * Dekont dosya isimlendirme yardımcı fonksiyonları
 */

export interface DekontNamingData {
  studentName: string
  studentSurname: string
  studentClass: string
  studentNumber?: string
  fieldName: string
  companyName: string
  month: number
  year: number
  originalFileName: string
  isAdditional?: boolean
  additionalIndex?: number
}

/**
 * Metni dosya ismi için temizler
 */
export function cleanFileName(text: string): string {
  return text
    .replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
}

/**
 * Ay numarasını Türkçe ay ismine çevirir
 */
export function getMonthName(month: number): string {
  const months = [
    'ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran',
    'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'
  ]
  return months[month - 1] || 'bilinmeyen'
}

/**
 * Anlamlı dekont dosya ismi oluşturur
 * Format: ad_soyad_sinif_no_alan_isletme_ay_yil[_ek_sayı].uzantı
 */
export function generateDekontFileName(data: DekontNamingData): string {
  const {
    studentName,
    studentSurname,
    studentClass,
    studentNumber,
    fieldName,
    companyName,
    month,
    year,
    originalFileName,
    isAdditional = false,
    additionalIndex = 0
  } = data

  // Dosya uzantısını al
  const fileExtension = originalFileName.split('.').pop()?.toLowerCase() || 'pdf'
  
  // Ay ismini al
  const monthName = getMonthName(month)
  
  // Dosya ismi bileşenlerini temizle
  const cleanedStudentName = cleanFileName(studentName)
  const cleanedStudentSurname = cleanFileName(studentSurname)
  const cleanedStudentClass = cleanFileName(studentClass)
  const cleanedStudentNumber = studentNumber ? cleanFileName(studentNumber) : ''
  const cleanedFieldName = cleanFileName(fieldName)
  const cleanedCompanyName = cleanFileName(companyName)
  
  // Dosya ismi bileşenlerini oluştur
  const parts = [
    cleanedStudentName,
    cleanedStudentSurname,
    cleanedStudentClass,
    cleanedStudentNumber,
    cleanedFieldName,
    cleanedCompanyName,
    monthName,
    year.toString()
  ].filter(Boolean) // Boş değerleri filtrele
  
  // Ek dekont belirteci ekle
  if (isAdditional && additionalIndex > 0) {
    parts.push(`ek${additionalIndex}`)
  }
  
  // Dosya ismini oluştur
  const fileName = parts.join('_') + '.' + fileExtension
  
  return fileName
}

/**
 * Dekont dosya ismini parse eder ve bilgilerini döndürür
 */
export function parseDekontFileName(fileName: string): Partial<DekontNamingData> | null {
  try {
    const parts = fileName.split('.')
    if (parts.length < 2) return null
    
    const nameWithoutExtension = parts[0]
    const extension = parts[1]
    const nameParts = nameWithoutExtension.split('_')
    
    if (nameParts.length < 7) return null
    
    const [
      studentName,
      studentSurname,
      studentClass,
      studentNumber,
      fieldName,
      companyName,
      monthName,
      year,
      ...rest
    ] = nameParts
    
    // Ay ismini numaraya çevir
    const months = [
      'ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran',
      'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'
    ]
    const month = months.indexOf(monthName) + 1
    
    const isAdditional = rest.some(part => part.startsWith('ek'))
    const additionalIndex = isAdditional ? 
      parseInt(rest.find(part => part.startsWith('ek'))?.replace('ek', '') || '0') : 0
    
    return {
      studentName,
      studentSurname,
      studentClass,
      studentNumber,
      fieldName,
      companyName,
      month,
      year: parseInt(year),
      originalFileName: fileName,
      isAdditional,
      additionalIndex
    }
  } catch (error) {
    console.error('Dekont dosya ismi parse edilemedi:', error)
    return null
  }
}

/**
 * Dekont dosya ismi validasyonu
 */
export function validateDekontFileName(fileName: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!fileName || fileName.trim() === '') {
    errors.push('Dosya ismi boş olamaz')
  }
  
  if (fileName.length > 255) {
    errors.push('Dosya ismi çok uzun (maksimum 255 karakter)')
  }
  
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(fileName)) {
    errors.push('Dosya isminde geçersiz karakterler bulunuyor')
  }
  
  const parsedData = parseDekontFileName(fileName)
  if (!parsedData) {
    errors.push('Dosya ismi format kurallarına uymuyor')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}