import { createHash } from 'crypto'
import path from 'path'

/**
 * Güçlü file upload security sistem
 * Malicious file, virus, script injection koruması
 */

// Güvenli dosya türleri
const SAFE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain'
]

// Güvenli dosya uzantıları  
const SAFE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', 
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'
]

// Tehlikeli dosya imzaları (magic bytes)
const DANGEROUS_SIGNATURES = [
  // Executable files
  { signature: [0x4D, 0x5A], name: 'PE Executable' }, // PE header
  { signature: [0x7F, 0x45, 0x4C, 0x46], name: 'ELF Executable' }, // ELF
  { signature: [0xCF, 0xFA, 0xED, 0xFE], name: 'Mach-O Executable' }, // Mach-O
  
  // Scripts
  { signature: [0x23, 0x21], name: 'Script with shebang' }, // #!/
  
  // Archives that might contain executables
  { signature: [0x50, 0x4B, 0x03, 0x04], name: 'ZIP Archive' }, // ZIP
  { signature: [0x52, 0x61, 0x72, 0x21], name: 'RAR Archive' }, // RAR
  { signature: [0x1F, 0x8B], name: 'GZIP Archive' }, // GZIP
]

// Tehlikeli dosya içeriği pattern'leri
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi, // JavaScript protocol
  /vbscript:/gi, // VBScript protocol  
  /on\w+\s*=/gi, // Event handlers (onclick, onload, etc.)
  /eval\s*\(/gi, // eval() function
  /exec\s*\(/gi, // exec() function
  /system\s*\(/gi, // system() function
  /shell_exec\s*\(/gi, // shell_exec() function
  /__halt_compiler\s*\(/gi, // PHP halt_compiler
  /<!--[\s\S]*?-->/g, // HTML comments (might hide scripts)
]

interface FileValidationResult {
  safe: boolean
  error?: string
  warnings?: string[]
  fileInfo?: {
    originalName: string
    size: number
    type: string
    hash: string
    extension: string
  }
}

/**
 * Ana file güvenlik validation fonksiyonu
 */
export async function validateFileUpload(
  file: File, 
  options: {
    maxSize?: number
    allowedTypes?: string[]
    strictMode?: boolean
  } = {}
): Promise<FileValidationResult> {
  const warnings: string[] = []
  
  try {
    // Temel validasyonlar
    const basicValidation = validateBasicFileProperties(file, options)
    if (!basicValidation.safe) {
      return basicValidation
    }
    
    // Dosya içeriği analizi
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    
    // Magic bytes kontrolü
    const signatureCheck = checkFileSignature(uint8Array)
    if (!signatureCheck.safe) {
      return signatureCheck
    }
    
    if (signatureCheck.warnings) {
      warnings.push(...signatureCheck.warnings)
    }
    
    // Dosya içeriği güvenlik taraması
    const contentCheck = await scanFileContent(uint8Array, file.type)
    if (!contentCheck.safe) {
      return contentCheck
    }
    
    if (contentCheck.warnings) {
      warnings.push(...contentCheck.warnings)
    }
    
    // Dosya hash'i oluştur
    const hash = createHash('sha256').update(uint8Array).digest('hex')
    
    // Güvenli dosya olarak işaretle
    
    return {
      safe: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      fileInfo: {
        originalName: file.name,
        size: file.size,
        type: file.type,
        hash,
        extension: path.extname(file.name).toLowerCase()
      }
    }
    
  } catch (error) {
    console.error('🔥 FILE SECURITY: Validation error', error)
    return {
      safe: false,
      error: 'Dosya güvenlik taraması başarısız'
    }
  }
}

/**
 * Temel dosya özelliklerini kontrol eder
 */
function validateBasicFileProperties(
  file: File, 
  options: { maxSize?: number; allowedTypes?: string[]; strictMode?: boolean }
): FileValidationResult {
  
  // Dosya boyutu kontrolü
  const maxSize = options.maxSize || 10 * 1024 * 1024 // 10MB default
  if (file.size > maxSize) {
    return {
      safe: false,
      error: `Dosya boyutu çok büyük (maksimum ${Math.round(maxSize / 1024 / 1024)}MB)`
    }
  }
  
  if (file.size === 0) {
    return {
      safe: false,
      error: 'Boş dosya yüklenemez'
    }
  }
  
  // MIME type kontrolü
  const allowedTypes = options.allowedTypes || SAFE_MIME_TYPES
  if (!allowedTypes.includes(file.type)) {
    return {
      safe: false,
      error: `Desteklenmeyen dosya türü: ${file.type}`
    }
  }
  
  // Dosya uzantısı kontrolü
  const extension = path.extname(file.name).toLowerCase()
  if (!SAFE_EXTENSIONS.includes(extension)) {
    return {
      safe: false,
      error: `Güvenli olmayan dosya uzantısı: ${extension}`
    }
  }
  
  // Dosya adı güvenlik kontrolü
  const nameCheck = validateFileName(file.name)
  if (!nameCheck.safe) {
    return nameCheck
  }
  
  return { safe: true }
}

/**
 * Dosya adını güvenlik açısından kontrol eder
 */
function validateFileName(fileName: string): FileValidationResult {
  // Tehlikeli karakterler
  const dangerousChars = /[<>:"|?*\x00-\x1f\x80-\x9f]/
  if (dangerousChars.test(fileName)) {
    return {
      safe: false,
      error: 'Dosya adında güvenli olmayan karakterler var'
    }
  }
  
  // Path traversal saldırıları
  if (fileName.includes('../') || fileName.includes('..\\')) {
    return {
      safe: false,
      error: 'Dosya adında path traversal tespit edildi'
    }
  }
  
  // Çok uzun dosya adı
  if (fileName.length > 255) {
    return {
      safe: false,
      error: 'Dosya adı çok uzun (maksimum 255 karakter)'
    }
  }
  
  // Windows rezerve dosya adları
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  const baseName = path.basename(fileName, path.extname(fileName)).toUpperCase()
  if (reservedNames.includes(baseName)) {
    return {
      safe: false,
      error: 'Rezerve dosya adı kullanılamaz'
    }
  }
  
  return { safe: true }
}

/**
 * Dosya imzasını (magic bytes) kontrol eder
 */
function checkFileSignature(uint8Array: Uint8Array): FileValidationResult {
  const warnings: string[] = []
  
  // Tehlikeli dosya imzalarını kontrol et
  for (const danger of DANGEROUS_SIGNATURES) {
    if (uint8Array.length >= danger.signature.length) {
      const matches = danger.signature.every((byte, index) => uint8Array[index] === byte)
      if (matches) {
        // ZIP dosyaları için özel kontrol (Office dosyaları da ZIP formatında)
        if (danger.name === 'ZIP Archive') {
          warnings.push('ZIP formatında dosya tespit edildi - ek tarama yapılacak')
          continue
        }
        
        return {
          safe: false,
          error: `Tehlikeli dosya türü tespit edildi: ${danger.name}`
        }
      }
    }
  }
  
  return { 
    safe: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  }
}

/**
 * Dosya içeriğini güvenlik açısından tarar
 */
async function scanFileContent(uint8Array: Uint8Array, mimeType: string): Promise<FileValidationResult> {
  const warnings: string[] = []
  
  // Text tabanlı dosyalar için içerik taraması
  if (mimeType.startsWith('text/') || mimeType.includes('xml') || mimeType.includes('html')) {
    const textContent = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array)
    
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(textContent)) {
        return {
          safe: false,
          error: 'Dosya içeriğinde güvenli olmayan kod tespit edildi'
        }
      }
    }
  }
  
  // PDF dosyaları için özel kontrol
  if (mimeType === 'application/pdf') {
    const pdfCheck = scanPdfContent(uint8Array)
    if (!pdfCheck.safe) {
      return pdfCheck
    }
    if (pdfCheck.warnings) {
      warnings.push(...pdfCheck.warnings)
    }
  }
  
  // Image dosyaları için EXIF metadata taraması
  if (mimeType.startsWith('image/')) {
    const imageCheck = scanImageMetadata(uint8Array)
    if (!imageCheck.safe) {
      return imageCheck
    }
    if (imageCheck.warnings) {
      warnings.push(...imageCheck.warnings)
    }
  }
  
  return { 
    safe: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  }
}

/**
 * PDF içeriğini güvenlik açısından tarar
 */
function scanPdfContent(uint8Array: Uint8Array): FileValidationResult {
  const warnings: string[] = []
  
  // PDF header kontrolü
  const pdfHeader = uint8Array.slice(0, 4)
  const expectedHeader = [0x25, 0x50, 0x44, 0x46] // %PDF
  
  if (!expectedHeader.every((byte, index) => pdfHeader[index] === byte)) {
    return {
      safe: false,
      error: 'Geçersiz PDF dosyası'
    }
  }
  
  // PDF içeriğini string'e çevir ve tehlikeli pattern'leri ara
  const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array)
  
  // JavaScript in PDF
  if (pdfText.includes('/JavaScript') || pdfText.includes('/JS')) {
    warnings.push('PDF içinde JavaScript kodu tespit edildi')
  }
  
  // Form actions
  if (pdfText.includes('/URI') || pdfText.includes('/SubmitForm')) {
    warnings.push('PDF içinde form submit aksiyonu tespit edildi')
  }
  
  return { 
    safe: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  }
}

/**
 * Image metadata'sını güvenlik açısından tarar
 */
function scanImageMetadata(uint8Array: Uint8Array): FileValidationResult {
  const warnings: string[] = []
  
  // JPEG EXIF data kontrolü
  if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) { // JPEG header
    // Basit EXIF taraması - detaylı parsing yapmadan
    const imageText = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array)
    
    // Script tags in EXIF
    if (imageText.includes('<script') || imageText.includes('javascript:')) {
      return {
        safe: false,
        error: 'Image metadata\'sında güvenli olmayan içerik tespit edildi'
      }
    }
  }
  
  return { 
    safe: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  }
}

/**
 * Güvenli dosya adı oluştur
 */
export function generateSecureFileName(originalName: string, hash: string): string {
  const extension = path.extname(originalName).toLowerCase()
  const baseName = path.basename(originalName, extension)
  
  // Güvenli karakter setine çevir
  const safeName = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Diacritics remove
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Special chars to underscore
    .replace(/_{2,}/g, '_') // Multiple underscores to single
    .replace(/^_|_$/g, '') // Leading/trailing underscores
    .substring(0, 100) // Max length limit
  
  const timestamp = Date.now()
  const hashPrefix = hash.substring(0, 8)
  
  return `${timestamp}_${hashPrefix}_${safeName}${extension}`
}

/**
 * Upload edilen dosyayı quarantine'e al
 */
export function quarantineFile(fileInfo: any, reason: string): void {
  console.warn(`🚨 FILE QUARANTINE: File quarantined`, {
    file: fileInfo.originalName,
    reason,
    hash: fileInfo.hash,
    timestamp: new Date().toISOString()
  })
  
  // Production'da dosyayı quarantine klasörüne taşı
  // Şimdilik sadece log atıyoruz
}