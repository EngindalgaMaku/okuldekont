/**
 * Güçlü input validation ve sanitization library
 * XSS, SQL Injection ve diğer saldırılara karşı koruma
 * Built-in JavaScript kullanımı - bağımlılık yok
 */

// Türkçe karakter desteği için regex
const TURKISH_NAME_REGEX = /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/
const TURKISH_TEXT_REGEX = /^[a-zA-ZçÇğĞıİöÖşŞüÜ0-9\s.,!?()-]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CUID_REGEX = /^c[a-z0-9]{24,}$/i

interface ValidationResult {
  valid: boolean
  error?: string
}

// Common validation functions
export const ValidationFunctions = {
  // Kişisel bilgiler
  name: (value: string): ValidationResult => {
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'Ad gerekli' }
    }
    if (value.length < 2) {
      return { valid: false, error: 'Ad en az 2 karakter olmalı' }
    }
    if (value.length > 50) {
      return { valid: false, error: 'Ad en fazla 50 karakter olabilir' }
    }
    if (!TURKISH_NAME_REGEX.test(value)) {
      return { valid: false, error: 'Geçersiz ad formatı' }
    }
    return { valid: true }
  },
    
  surname: (value: string): ValidationResult => {
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'Soyad gerekli' }
    }
    if (value.length < 2) {
      return { valid: false, error: 'Soyad en az 2 karakter olmalı' }
    }
    if (value.length > 50) {
      return { valid: false, error: 'Soyad en fazla 50 karakter olabilir' }
    }
    if (!TURKISH_NAME_REGEX.test(value)) {
      return { valid: false, error: 'Geçersiz soyad formatı' }
    }
    return { valid: true }
  },
    
  email: (value?: string): ValidationResult => {
    if (!value) return { valid: true } // Optional
    if (typeof value !== 'string') {
      return { valid: false, error: 'Geçersiz email' }
    }
    if (value.length > 100) {
      return { valid: false, error: 'Email en fazla 100 karakter olabilir' }
    }
    if (!EMAIL_REGEX.test(value)) {
      return { valid: false, error: 'Geçersiz email formatı' }
    }
    return { valid: true }
  },
    
  phone: (value?: string): ValidationResult => {
    if (!value) return { valid: true } // Optional
    if (typeof value !== 'string') {
      return { valid: false, error: 'Geçersiz telefon' }
    }
    if (!/^[0-9+\s()-]+$/.test(value)) {
      return { valid: false, error: 'Geçersiz telefon formatı' }
    }
    if (value.length < 10 || value.length > 20) {
      return { valid: false, error: 'Telefon 10-20 karakter olmalı' }
    }
    return { valid: true }
  },
    
  tcNo: (value?: string): ValidationResult => {
    if (!value) return { valid: true } // Optional
    if (typeof value !== 'string') {
      return { valid: false, error: 'Geçersiz TC No' }
    }
    if (!/^[0-9]{11}$/.test(value)) {
      return { valid: false, error: 'TC Kimlik No 11 haneli olmalı' }
    }
    return { valid: true }
  },
    
  // Mali veriler - 0 ve undefined kabul edilir
  amount: (value?: number): ValidationResult => {
    // Undefined veya null değerler kabul edilir (optional field)
    if (value === undefined || value === null) {
      return { valid: true }
    }
    
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: 'Geçersiz miktar' }
    }
    
    // 0 ve pozitif değerler kabul edilir
    if (value < 0) {
      return { valid: false, error: 'Miktar negatif olamaz' }
    }
    
    if (value > 1000000) {
      return { valid: false, error: 'Miktar çok büyük' }
    }
    
    if (!isFinite(value)) {
      return { valid: false, error: 'Geçersiz miktar' }
    }
    
    return { valid: true }
  },
    
  // Şirket bilgileri
  companyName: (value: string): ValidationResult => {
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'Şirket adı gerekli' }
    }
    if (value.length < 2) {
      return { valid: false, error: 'Şirket adı en az 2 karakter olmalı' }
    }
    if (value.length > 200) {
      return { valid: false, error: 'Şirket adı en fazla 200 karakter olabilir' }
    }
    if (!TURKISH_TEXT_REGEX.test(value)) {
      return { valid: false, error: 'Geçersiz şirket adı formatı' }
    }
    return { valid: true }
  },
    
  taxNumber: (value?: string): ValidationResult => {
    if (!value) return { valid: true } // Optional
    if (typeof value !== 'string') {
      return { valid: false, error: 'Geçersiz vergi numarası' }
    }
    if (!/^[0-9]{10,11}$/.test(value)) {
      return { valid: false, error: 'Vergi numarası 10-11 haneli olmalı' }
    }
    return { valid: true }
  },
    
  // Güvenlik
  pin: (value: string): ValidationResult => {
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'PIN gerekli' }
    }
    if (!/^[0-9]{4}$/.test(value)) {
      return { valid: false, error: 'PIN 4 haneli olmalı' }
    }
    return { valid: true }
  },
    
  password: (value: string): ValidationResult => {
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'Şifre gerekli' }
    }
    if (value.length < 8) {
      return { valid: false, error: 'Şifre en az 8 karakter olmalı' }
    }
    if (value.length > 128) {
      return { valid: false, error: 'Şifre en fazla 128 karakter olabilir' }
    }
    return { valid: true }
  },
    
  // Genel text
  description: (value?: string): ValidationResult => {
    if (!value) return { valid: true } // Optional
    if (typeof value !== 'string') {
      return { valid: false, error: 'Geçersiz açıklama' }
    }
    if (value.length > 1000) {
      return { valid: false, error: 'Açıklama en fazla 1000 karakter olabilir' }
    }
    if (!TURKISH_TEXT_REGEX.test(value)) {
      return { valid: false, error: 'Geçersiz açıklama formatı' }
    }
    return { valid: true }
  },
    
  // Tarihler
  date: (value: string): ValidationResult => {
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'Tarih gerekli' }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { valid: false, error: 'Geçersiz tarih formatı (YYYY-MM-DD)' }
    }
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Geçersiz tarih' }
    }
    return { valid: true }
  },
    
  // ID'ler - UUID ve CUID destekli
  id: (value: string): ValidationResult => {
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'ID gerekli' }
    }
    // UUID veya CUID formatını kontrol et
    if (!UUID_REGEX.test(value) && !CUID_REGEX.test(value)) {
      return { valid: false, error: 'Geçersiz ID formatı' }
    }
    return { valid: true }
  },
    
  // Sayfa numaraları
  page: (value: number): ValidationResult => {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return { valid: false, error: 'Sayfa numarası tam sayı olmalı' }
    }
    if (value <= 0) {
      return { valid: false, error: 'Sayfa numarası pozitif olmalı' }
    }
    if (value > 1000) {
      return { valid: false, error: 'Sayfa numarası çok büyük' }
    }
    return { valid: true }
  },
    
  limit: (value: number): ValidationResult => {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return { valid: false, error: 'Limit tam sayı olmalı' }
    }
    if (value <= 0) {
      return { valid: false, error: 'Limit pozitif olmalı' }
    }
    if (value > 100) {
      return { valid: false, error: 'Limit en fazla 100 olabilir' }
    }
    return { valid: true }
  }
}

/**
 * HTML içeriğini sanitize eder (XSS koruması)
 * Built-in implementation - DOMPurify dependency yok
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
}

/**
 * SQL injection'a karşı string sanitize eder
 */
export function sanitizeForSql(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // Tehlikeli karakterleri temizle
  return input
    .replace(/['"\\;]/g, '') // SQL karakterleri
    .replace(/--/g, '') // SQL comment
    .replace(/\/\*/g, '') // SQL block comment başlangıcı
    .replace(/\*\//g, '') // SQL block comment bitişi
    .replace(/xp_/gi, '') // SQL Server extended procedures
    .replace(/sp_/gi, '') // SQL Server stored procedures
    .trim()
}

/**
 * Genel string sanitization
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  return sanitizeHtml(sanitizeForSql(input))
}

/**
 * Öğrenci verilerini validate eder
 */
export function validateStudent(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  const nameResult = ValidationFunctions.name(data.name)
  if (!nameResult.valid) errors.push(nameResult.error!)
  
  const surnameResult = ValidationFunctions.surname(data.surname)
  if (!surnameResult.valid) errors.push(surnameResult.error!)
  
  if (!data.className || data.className.length < 1 || data.className.length > 20) {
    errors.push('Sınıf gerekli ve en fazla 20 karakter olmalı')
  }
  
  if (!data.number || data.number.length < 1 || data.number.length > 20) {
    errors.push('Okul numarası gerekli ve en fazla 20 karakter olmalı')
  }
  
  const emailResult = ValidationFunctions.email(data.email)
  if (!emailResult.valid) errors.push(emailResult.error!)
  
  const phoneResult = ValidationFunctions.phone(data.phone)
  if (!phoneResult.valid) errors.push(phoneResult.error!)
  
  const tcNoResult = ValidationFunctions.tcNo(data.tcNo)
  if (!tcNoResult.valid) errors.push(tcNoResult.error!)
  
  if (data.alanId) {
    const alanIdResult = ValidationFunctions.id(data.alanId)
    if (!alanIdResult.valid) errors.push(alanIdResult.error!)
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Öğretmen verilerini validate eder
 */
export function validateTeacher(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  const nameResult = ValidationFunctions.name(data.name)
  if (!nameResult.valid) errors.push(nameResult.error!)
  
  const surnameResult = ValidationFunctions.surname(data.surname)
  if (!surnameResult.valid) errors.push(surnameResult.error!)
  
  const emailResult = ValidationFunctions.email(data.email)
  if (!emailResult.valid) errors.push(emailResult.error!)
  
  const phoneResult = ValidationFunctions.phone(data.phone)
  if (!phoneResult.valid) errors.push(phoneResult.error!)
  
  const pinResult = ValidationFunctions.pin(data.pin)
  if (!pinResult.valid) errors.push(pinResult.error!)
  
  if (data.alanId) {
    const alanIdResult = ValidationFunctions.id(data.alanId)
    if (!alanIdResult.valid) errors.push(alanIdResult.error!)
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Şirket verilerini validate eder
 */
export function validateCompany(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  const nameResult = ValidationFunctions.companyName(data.name)
  if (!nameResult.valid) errors.push(nameResult.error!)
  
  const contactResult = ValidationFunctions.name(data.contact)
  if (!contactResult.valid) errors.push('İletişim kişisi: ' + contactResult.error!)
  
  const emailResult = ValidationFunctions.email(data.email)
  if (!emailResult.valid) errors.push(emailResult.error!)
  
  const phoneResult = ValidationFunctions.phone(data.phone)
  if (!phoneResult.valid) errors.push(phoneResult.error!)
  
  if (data.address && (typeof data.address !== 'string' || data.address.length > 500)) {
    errors.push('Adres en fazla 500 karakter olabilir')
  }
  
  const taxNumberResult = ValidationFunctions.taxNumber(data.taxNumber)
  if (!taxNumberResult.valid) errors.push(taxNumberResult.error!)
  
  if (data.pin) {
    const pinResult = ValidationFunctions.pin(data.pin)
    if (!pinResult.valid) errors.push(pinResult.error!)
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Dekont verilerini validate eder
 */
export function validateDekont(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (data.stajId) {
    const stajIdResult = ValidationFunctions.id(data.stajId)
    if (!stajIdResult.valid) errors.push(stajIdResult.error!)
  }
  
  if (data.amount !== undefined && data.amount !== null) {
    if (typeof data.amount !== 'number' || isNaN(data.amount)) {
      errors.push('Geçersiz miktar formatı')
    } else if (data.amount < 0) {
      errors.push('Miktar negatif olamaz')
    } else if (data.amount > 1000000) {
      errors.push('Miktar çok büyük')
    } else if (!isFinite(data.amount)) {
      errors.push('Geçersiz miktar')
    }
  }
  
  if (typeof data.month !== 'number' || !Number.isInteger(data.month) || data.month < 1 || data.month > 12) {
    errors.push('Ay 1-12 arasında tam sayı olmalı')
  }
  
  if (typeof data.year !== 'number' || !Number.isInteger(data.year) || data.year < 2020 || data.year > 2030) {
    errors.push('Yıl 2020-2030 arasında olmalı')
  }
  
  const descriptionResult = ValidationFunctions.description(data.description)
  if (!descriptionResult.valid) errors.push(descriptionResult.error!)
  
  return { valid: errors.length === 0, errors }
}

/**
 * Mesaj verilerini validate eder
 */
export function validateMessage(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.content || typeof data.content !== 'string' || data.content.length < 1) {
    errors.push('Mesaj içeriği gerekli')
  } else if (data.content.length > 2000) {
    errors.push('Mesaj en fazla 2000 karakter olabilir')
  }
  
  const validMessageTypes = ['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'SYSTEM', 'ANNOUNCEMENT']
  if (!data.messageType || !validMessageTypes.includes(data.messageType)) {
    errors.push('Geçersiz mesaj türü')
  }
  
  const conversationIdResult = ValidationFunctions.id(data.conversationId)
  if (!conversationIdResult.valid) errors.push('Konuşma ID: ' + conversationIdResult.error!)
  
  return { valid: errors.length === 0, errors }
}

/**
 * Request body'yi validate eder ve sanitize eder
 */
export function validateAndSanitize(
  data: unknown,
  validator: (data: any) => { valid: boolean; errors: string[] }
): { success: true; data: any } | { success: false; error: string } {
  try {
    // Önce sanitize et
    const sanitized = sanitizeObject(data)
    
    // Sonra validate et
    const validation = validator(sanitized)
    
    if (!validation.valid) {
      return { success: false, error: `Validation hatası: ${validation.errors.join(', ')}` }
    }
    
    return { success: true, data: sanitized }
  } catch (error) {
    return { success: false, error: 'Validation hatası' }
  }
}

/**
 * Object'teki tüm string değerleri sanitize eder
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key])
      }
    }
    return sanitized
  }
  
  return obj
}

/**
 * File upload validation
 */
export const FileValidation = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png', 
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  
  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.maxSize) {
      return { valid: false, error: 'Dosya boyutu çok büyük (max 10MB)' }
    }
    
    if (!this.allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Desteklenmeyen dosya türü' }
    }
    
    return { valid: true }
  }
}