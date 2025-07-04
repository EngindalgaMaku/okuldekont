import { supabase } from './supabase'

// Dosya yükleme fonksiyonu
export const uploadFile = async (
  bucket: 'dekontlar' | 'belgeler',
  file: File,
  prefix?: string
): Promise<{ url: string; path: string } | null> => {
  try {
    // Dosya adını benzersiz yap
    const fileExt = file.name.split('.').pop()
    const fileName = `${prefix || ''}${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    
    // Dosyayı yükle
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Dosya yükleme hatası:', error)
      throw error
    }

    // Public URL al
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      url: publicUrlData.publicUrl,
      path: data.path
    }
  } catch (error) {
    console.error('Upload işlemi başarısız:', error)
    return null
  }
}

// Dosya silme fonksiyonu
export const deleteFile = async (
  bucket: 'dekontlar' | 'belgeler',
  path: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Dosya silme hatası:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete işlemi başarısız:', error)
    return false
  }
}

// Dosya URL'sini al
export const getFileUrl = (
  bucket: 'dekontlar' | 'belgeler',
  path: string
): string => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return data.publicUrl
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