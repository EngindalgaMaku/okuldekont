import Tesseract from 'tesseract.js';

export interface DekontOCRResult {
  miktar?: number;
  tarih?: string;
  aciklama?: string;
  banka?: string;
  hesapNo?: string;
  rawText: string;
  confidence: number;
}

export interface DekontValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  validations: {
    nameMatch: boolean;
    amountValid: boolean;
    dateValid: boolean;
    formatValid: boolean;
  };
}

/**
 * Dekont resminden OCR ile bilgi çıkarma
 */
export async function extractDekontInfo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<DekontOCRResult> {
  try {
    // Tesseract.js ile OCR işlemi
    const result = await Tesseract.recognize(file, 'tur+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      }
    });

    const text = result.data.text;
    const confidence = result.data.confidence;

    // Dekont bilgilerini çıkar
    const extracted = parseDekontText(text);

    return {
      ...extracted,
      rawText: text,
      confidence: confidence
    };
  } catch (error) {
    console.error('OCR hatası:', error);
    throw new Error('Dekont okuma işlemi başarısız oldu');
  }
}

/**
 * OCR metninden dekont bilgilerini çıkarma
 */
function parseDekontText(text: string): Partial<DekontOCRResult> {
  const result: Partial<DekontOCRResult> = {};

  // Miktar çıkarma (TL, ₺, lira vb.)
  const amountPatterns = [
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:TL|₺|lira|LIRA)/i,
    /(?:toplam|tutar|miktar|ödenen)[\s:]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i,
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:TL|₺)/i
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = match[1].replace(/[.,]/g, '');
      result.miktar = parseFloat(amount.slice(0, -2) + '.' + amount.slice(-2));
      break;
    }
  }

  // Tarih çıkarma
  const datePatterns = [
    /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/,
    /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2})/,
    /(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.tarih = match[0];
      break;
    }
  }

  // Banka adı çıkarma
  const bankPatterns = [
    /(ziraat|garanti|akbank|yapı kredi|işbank|vakıfbank|halkbank|denizbank|teb|ing|qnb)/i,
    /(türkiye cumhuriyeti ziraat bankası|türkiye garanti bankası|akbank)/i
  ];

  for (const pattern of bankPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.banka = match[1];
      break;
    }
  }

  // Hesap numarası çıkarma
  const accountPattern = /(?:hesap|account|iban)[\s:]*(\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4})/i;
  const accountMatch = text.match(accountPattern);
  if (accountMatch) {
    result.hesapNo = accountMatch[1];
  }

  // Açıklama çıkarma (referans, açıklama vb.)
  const descriptionPatterns = [
    /(?:açıklama|referans|ref|memo)[\s:]*([^\n\r]{10,50})/i,
    /(?:transfer|havale|ödeme)\s+([^\n\r]{10,50})/i
  ];

  for (const pattern of descriptionPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.aciklama = match[1].trim();
      break;
    }
  }

  return result;
}

/**
 * Dosya türünü kontrol et
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * PDF dosyasını kontrol et
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}

/**
 * PDF'yi resme çevir (geçici olarak devre dışı)
 */
export async function convertPDFToImage(file: File): Promise<File> {
  throw new Error('PDF desteği geçici olarak devre dışı. Lütfen resim formatında (JPG, PNG) yükleyin.');
}

/**
 * Dosyayı OCR için hazırla
 */
export async function prepareFileForOCR(file: File): Promise<File> {
  // Boyut kontrolü
  if (file.size > 10 * 1024 * 1024) { // 10MB
    throw new Error('Dosya boyutu 10MB\'dan küçük olmalıdır.');
  }

  // Resim dosyaları için direkt döndür
  if (isImageFile(file)) {
    return file;
  }

  // PDF desteği geçici olarak devre dışı
  if (isPDFFile(file)) {
    throw new Error('PDF desteği geçici olarak devre dışı. Lütfen JPG, PNG veya JPEG formatında yükleyin.');
  }

  throw new Error('Desteklenmeyen dosya türü. Lütfen JPG, PNG veya JPEG formatında yükleyin.');
}

/**
 * OCR sonuçlarını doğrula
 */
export function validateOCRResult(result: DekontOCRResult): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Güven skoru kontrolü
  if (result.confidence < 60) {
    warnings.push('Düşük güven skoru. Lütfen sonuçları manuel kontrol edin.');
  }

  // Miktar kontrolü
  if (!result.miktar || result.miktar <= 0) {
    errors.push('Geçerli bir miktar bulunamadı.');
  }

  // Tarih kontrolü
  if (!result.tarih) {
    warnings.push('Tarih bilgisi bulunamadı.');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Dekont içindeki öğrenci adını doğrula
 */
export function validateStudentName(
  ocrText: string,
  studentName: string,
  studentSurname: string
): {
  found: boolean;
  matches: string[];
  confidence: number;
} {
  const fullName = `${studentName} ${studentSurname}`.toLowerCase();
  const reverseName = `${studentSurname} ${studentName}`.toLowerCase();
  const cleanText = ocrText.toLowerCase()
    .replace(/[^a-züğşıöçA-ZÜĞŞIÖÇ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const matches: string[] = [];
  let confidence = 0;

  // Tam isim arama
  if (cleanText.includes(fullName)) {
    matches.push(`Tam isim bulundu: ${fullName}`);
    confidence += 50;
  }

  if (cleanText.includes(reverseName)) {
    matches.push(`Ters sıralı isim bulundu: ${reverseName}`);
    confidence += 50;
  }

  // Ayrı ayrı isim arama
  const nameFound = cleanText.includes(studentName.toLowerCase());
  const surnameFound = cleanText.includes(studentSurname.toLowerCase());

  if (nameFound && surnameFound) {
    matches.push(`Ad ve soyad ayrı ayrı bulundu`);
    confidence += 30;
  } else if (nameFound) {
    matches.push(`Sadece ad bulundu: ${studentName}`);
    confidence += 15;
  } else if (surnameFound) {
    matches.push(`Sadece soyad bulundu: ${studentSurname}`);
    confidence += 15;
  }

  // Benzer isim arama (Levenshtein distance)
  const words = cleanText.split(' ');
  for (const word of words) {
    if (word.length >= 3) {
      const nameDistance = levenshteinDistance(word, studentName.toLowerCase());
      const surnameDistance = levenshteinDistance(word, studentSurname.toLowerCase());
      
      if (nameDistance <= 2 && nameDistance < studentName.length * 0.3) {
        matches.push(`Benzer ad bulundu: ${word} (${studentName})`);
        confidence += 10;
      }
      
      if (surnameDistance <= 2 && surnameDistance < studentSurname.length * 0.3) {
        matches.push(`Benzer soyad bulundu: ${word} (${studentSurname})`);
        confidence += 10;
      }
    }
  }

  return {
    found: matches.length > 0,
    matches: matches,
    confidence: Math.min(confidence, 100)
  };
}

/**
 * Levenshtein distance hesaplama (string benzerliği)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Kapsamlı dekont doğrulama
 */
export function validateDekontComplete(
  ocrResult: DekontOCRResult,
  studentName: string,
  studentSurname: string,
  expectedAmount?: number
): DekontValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // İsim doğrulama
  const nameValidation = validateStudentName(ocrResult.rawText, studentName, studentSurname);
  const nameMatch = nameValidation.found && nameValidation.confidence >= 30;
  
  if (!nameMatch) {
    errors.push(`Dekont üzerinde "${studentName} ${studentSurname}" ismi bulunamadı`);
  } else if (nameValidation.confidence < 60) {
    warnings.push(`İsim eşleşmesi düşük güven seviyesinde (${nameValidation.confidence}%)`);
  }
  
  // Miktar doğrulama
  const amountValid = ocrResult.miktar !== undefined && ocrResult.miktar > 0;
  if (!amountValid) {
    errors.push('Geçerli bir ödeme miktarı bulunamadı');
  } else if (expectedAmount && Math.abs(ocrResult.miktar! - expectedAmount) > 0.01) {
    warnings.push(`Girilen miktar (${expectedAmount} TL) ile dekont miktarı (${ocrResult.miktar} TL) uyuşmuyor`);
  }
  
  // Tarih doğrulama
  const dateValid = ocrResult.tarih !== undefined && ocrResult.tarih.length > 0;
  if (!dateValid) {
    warnings.push('Dekont üzerinde tarih bilgisi bulunamadı');
  }
  
  // Format doğrulama
  const formatValid = ocrResult.confidence >= 60;
  if (!formatValid) {
    warnings.push('Dekont kalitesi düşük, manual kontrol gerekebilir');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    validations: {
      nameMatch,
      amountValid,
      dateValid,
      formatValid
    }
  };
}