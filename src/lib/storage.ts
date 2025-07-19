import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const writeFile = promisify(fs.writeFile)
const unlink = promisify(fs.unlink)
const mkdir = promisify(fs.mkdir)
const exists = promisify(fs.exists)

// Dosya yükleme fonksiyonu
export const uploadFile = async (
  bucket: 'dekontlar' | 'belgeler',
  file: File,
  prefix?: string,
  customFileName?: string
): Promise<{ url: string; path: string } | null> => {
  try {
    // Dosya adını belirle
    const fileExt = file.name.split('.').pop()
    const fileName = customFileName || `${prefix || ''}${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    
    // Upload klasörünü oluştur
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', bucket)
    if (!await exists(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }
    
    // Dosya yolunu oluştur
    const filePath = path.join(uploadDir, fileName)
    const relativePath = path.join('uploads', bucket, fileName)
    
    // File'ı buffer'a çevir
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Dosyayı yaz
    await writeFile(filePath, buffer)
    
    // Public URL'i oluştur
    const publicUrl = `/uploads/${bucket}/${fileName}`

    return {
      url: publicUrl,
      path: relativePath
    }
  } catch (error) {
    console.error('Upload işlemi başarısız:', error)
    return null
  }
}

// Dosya silme fonksiyonu
export const deleteFile = async (
  bucket: 'dekontlar' | 'belgeler',
  filePath: string
): Promise<boolean> => {
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath)
    
    if (await exists(fullPath)) {
      await unlink(fullPath)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Delete işlemi başarısız:', error)
    return false
  }
}

// Dosya URL'sini al
export const getFileUrl = (
  bucket: 'dekontlar' | 'belgeler',
  filePath: string
): string => {
  // Eğer path zaten tam URL ise, direkt döndür
  if (filePath.startsWith('/uploads/')) {
    return filePath
  }
  
  // Değilse public URL oluştur
  return `/uploads/${bucket}/${filePath}`
}

// Dosya boyutu kontrolü (MB cinsinden)
export const checkFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const fileSizeMB = file.size / (1024 * 1024)
  return fileSizeMB <= maxSizeMB
}

// Dosya türü kontrolü
export const checkFileType = (
  file: File, 
  allowedTypes: string[] = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
): boolean => {
  const fileExt = file.name.split('.').pop()?.toLowerCase()
  return fileExt ? allowedTypes.includes(fileExt) : false
}

// Validation fonksiyonu
export const validateFile = (
  file: File,
  maxSizeMB: number = 10,
  allowedTypes: string[] = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
): { valid: boolean; error?: string } => {
  if (!checkFileSize(file, maxSizeMB)) {
    return { valid: false, error: `Dosya boyutu ${maxSizeMB}MB'dan küçük olmalıdır.` }
  }

  if (!checkFileType(file, allowedTypes)) {
    return { valid: false, error: `Desteklenen dosya türleri: ${allowedTypes.join(', ').toUpperCase()}` }
  }

  return { valid: true }
}

// Upload klasörünü initialize et
export const initializeUploadDirectories = async (): Promise<void> => {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const dekontlarDir = path.join(uploadsDir, 'dekontlar')
    const belgelerDir = path.join(uploadsDir, 'belgeler')
    
    if (!await exists(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }
    
    if (!await exists(dekontlarDir)) {
      await mkdir(dekontlarDir, { recursive: true })
    }
    
    if (!await exists(belgelerDir)) {
      await mkdir(belgelerDir, { recursive: true })
    }
    
    console.log('Upload directories initialized')
  } catch (error) {
    console.error('Failed to initialize upload directories:', error)
  }
}