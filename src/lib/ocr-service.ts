import sharp from 'sharp';
import path from 'path';

// OCR Analiz Sonucu Interface
export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  lines: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
}

// Görüntü ön işleme fonksiyonu
export async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  try {
    console.log('OCR: Preprocessing image...');
    
    const processedBuffer = await sharp(buffer)
      .resize(null, 2000, { 
        withoutEnlargement: false,
        fit: 'inside' 
      })
      .sharpen()
      .normalize()
      .gamma(1.2)
      .linear(1.1, -(128 * 1.1) + 128)
      .jpeg({ quality: 95 })
      .toBuffer();
    
    console.log('OCR: Image preprocessing completed');
    return processedBuffer;
  } catch (error) {
    console.error('OCR: Image preprocessing failed:', error);
    return buffer; // Fallback to original
  }
}

// Ana OCR fonksiyonu - Geçici olarak devre dışı
export async function performOCR(imageBuffer: Buffer): Promise<OCRResult> {
  console.log('⚠️ OCR: Tesseract.js geçici olarak devre dışı - placeholder data döndürülüyor');
  
  // Placeholder OCR sonucu
  return {
    text: 'OCR geçici olarak devre dışı. AI analiz sistemi beklenmedik verilerle çalışmaya devam ediyor.',
    confidence: 75,
    words: [],
    lines: []
  };
}

// PDF'den görüntü çıkarma (Şimdilik devre dışı - native bağımlılık sorunu)
export async function convertPdfToImage(pdfBuffer: Buffer): Promise<Buffer> {
  throw new Error('PDF konvertörü şu anda devre dışı. Lütfen JPG, PNG veya diğer görüntü formatlarını kullanın.');
}

// Dosya türü tespiti ve işleme
export async function processDocumentForOCR(fileBuffer: Buffer, fileName: string): Promise<OCRResult> {
  const fileExtension = path.extname(fileName).toLowerCase();
  
  let imageBuffer: Buffer;
  
  if (fileExtension === '.pdf') {
    throw new Error('PDF desteği şu anda devre dışı. Lütfen dekontunuzu JPG, PNG veya diğer görüntü formatında yükleyin.');
  } else if (['.jpg', '.jpeg', '.png', '.tiff', '.bmp'].includes(fileExtension)) {
    imageBuffer = fileBuffer;
  } else {
    throw new Error(`Desteklenmeyen dosya türü: ${fileExtension}. Desteklenen formatlar: JPG, PNG, TIFF, BMP`);
  }
  
  return await performOCR(imageBuffer);
}

// Cleanup function
export async function cleanupOCR() {
  console.log('OCR: Cleanup completed (no workers to terminate)');
}

// Financial data extraction patterns
export const FINANCIAL_PATTERNS = {
  amount: /₺?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*₺?/gi,
  date: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g,
  iban: /TR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/gi,
  companyTax: /(\d{10})/g
};

// Yapılandırılmış veri çıkarma
export function extractStructuredData(ocrResult: OCRResult, expectedData: any) {
  const extractedData: any = {
    amounts: [],
    dates: [],
    ibans: [],
    companyInfo: [],
    confidence: ocrResult.confidence
  };
  
  const text = ocrResult.text;
  
  // Para miktarlarını çıkar
  const amountMatches = Array.from(text.matchAll(FINANCIAL_PATTERNS.amount));
  extractedData.amounts = amountMatches.map(match => ({
    value: match[1].replace(/[.,]/g, ''),
    raw: match[0],
    confidence: 0.8
  }));
  
  // Tarihleri çıkar
  const dateMatches = Array.from(text.matchAll(FINANCIAL_PATTERNS.date));
  extractedData.dates = dateMatches.map(match => ({
    day: match[1],
    month: match[2],
    year: match[3],
    raw: match[0]
  }));
  
  // IBAN'ları çıkar
  const ibanMatches = Array.from(text.matchAll(FINANCIAL_PATTERNS.iban));
  extractedData.ibans = ibanMatches.map(match => match[0].replace(/\s/g, ''));
  
  return extractedData;
}