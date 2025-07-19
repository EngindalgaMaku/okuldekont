// Client-side storage utilities (no fs module)

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

// Client-side file upload via API
export const uploadFile = async (
  bucket: 'dekontlar' | 'belgeler',
  file: File,
  endpoint: string,
  additionalData?: Record<string, string>
): Promise<{ url: string; path: string } | null> => {
  try {
    const formData = new FormData();
    formData.append('dosya', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return {
      url: result.dosya_url || result.url,
      path: result.dosya_url || result.path
    };
  } catch (error) {
    console.error('Upload işlemi başarısız:', error);
    return null;
  }
}