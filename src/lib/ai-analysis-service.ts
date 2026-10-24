// Gelişmiş Kural Tabanlı AI Analiz Sistemi
// Tamamen ücretsiz, dış servislere bağımlı olmayan çözüm

// AI Analiz Sonucu Interface
export interface AIAnalysisResult {
  authenticity: {
    score: number; // 0-1 arası gerçeklik skoru
    flags: string[]; // Şüpheli durumlar
    confidence: number;
  };
  dataValidation: {
    extractedData: {
      studentName?: string;
      companyName?: string;
      amount?: number;
      date?: string;
      iban?: string;
    };
    consistency: {
      score: number; // Tutarlılık skoru
      issues: string[];
    };
  };
  securityAssessment: {
    forgeryRisk: number; // 0-1 arası sahtelik riski
    tamperingDetected: boolean;
    qualityScore: number; // Görüntü kalite skoru
    warnings: string[];
  };
  overallReliability: number; // 0-1 arası genel güvenirlik
  recommendation: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
  reasoning: string[];
}

// Türkçe finansal doküman pattern'ları
const FINANCIAL_PATTERNS = {
  // Para miktarı pattern'ları
  amount: [
    /₺\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g, // ₺1.500,00
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*₺/g, // 1.500,00 ₺
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*TL/gi, // 1.500,00 TL
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*lira/gi, // 1.500 lira
  ],
  
  // Tarih pattern'ları
  date: [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g, // DD/MM/YYYY
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/g, // DD/MM/YY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g, // YYYY/MM/DD
  ],
  
  // IBAN pattern'ı
  iban: /TR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/gi,
  
  // İşletme tipleri
  companyTypes: [
    'ltd', 'şti', 'ltd.şti', 'a.ş', 'a.ş.', 'anonim şirket',
    'limited şirket', 'koop', 'kooperatif', 'dernek', 'vakıf'
  ],
  
  // Şüpheli kelimeler
  suspiciousWords: [
    'sahte', 'kopya', 'duplicate', 'copy', 'düzeltme', 'correction',
    'iptal', 'cancel', 'void', 'test', 'örnek', 'sample'
  ]
};

// Türkçe isim pattern'ları
const TURKISH_NAME_PATTERNS = {
  // Türkçe harfler dahil isim pattern'ı
  name: /[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)+/g,
  
  // Yaygın Türkçe isimleri
  commonNames: [
    'ahmet', 'mehmet', 'mustafa', 'ali', 'hüseyin', 'hasan', 'ibrahim', 'ismail',
    'fatma', 'ayşe', 'emine', 'hatice', 'zeynep', 'sultan', 'hanife', 'sevgül'
  ],
  
  // Yaygın Türkçe soyadları
  commonSurnames: [
    'yılmaz', 'kaya', 'demir', 'şahin', 'çelik', 'yıldız', 'yıldırım', 'öztürk',
    'aydin', 'özdemir', 'arslan', 'doğan', 'kılıç', 'aslan', 'çetin', 'kara'
  ]
};

// Ana analiz fonksiyonu (tamamen ücretsiz)
export async function analyzeWithAI(
  ocrText: string,
  expectedData: {
    studentName?: string;
    companyName?: string;
    month?: number;
    year?: number;
    amount?: number;
  }
): Promise<AIAnalysisResult> {
  
  return performAdvancedRuleBasedAnalysis(ocrText, expectedData);
}

// Gelişmiş kural tabanlı analiz sistemi (tamamen ücretsiz)
function performAdvancedRuleBasedAnalysis(
  ocrText: string,
  expectedData: any
): AIAnalysisResult {

  const text = ocrText.toLowerCase();
  const originalText = ocrText;
  const flags: string[] = [];
  const warnings: string[] = [];
  const issues: string[] = [];
  
  let authenticityScore = 0.3; // Başlangıç skoru
  let consistencyScore = 0.3;
  let qualityScore = 0.5;
  
  // === 1. VERİ ÇIKARIMI VE DOĞRULAMA ===
  const extractedData = performAdvancedDataExtraction(originalText);
  
  // Beklenen verilerle karşılaştırma
  if (expectedData.studentName) {
    const nameMatch = checkNameMatch(text, expectedData.studentName);
    if (nameMatch.score > 0.8) {
      authenticityScore += 0.15;
      consistencyScore += 0.15;
    } else if (nameMatch.score > 0.5) {
      authenticityScore += 0.08;
      warnings.push(`Öğrenci adı kısmen eşleşiyor (${Math.round(nameMatch.score * 100)}%)`);
    } else {
      flags.push('Beklenen öğrenci adı bulunamadı');
      issues.push('Öğrenci adı uyumsuzluğu');
    }
  }
  
  if (expectedData.companyName) {
    const companyMatch = checkCompanyMatch(text, expectedData.companyName);
    if (companyMatch.score > 0.8) {
      authenticityScore += 0.15;
      consistencyScore += 0.15;
    } else if (companyMatch.score > 0.5) {
      authenticityScore += 0.08;
      warnings.push(`İşletme adı kısmen eşleşiyor (${Math.round(companyMatch.score * 100)}%)`);
    } else {
      flags.push('Beklenen işletme adı bulunamadı');
      issues.push('İşletme adı uyumsuzluğu');
    }
  }
  
  // === 2. FINANSAL VERİ ANALİZİ ===
  const financialAnalysis = analyzeFinancialData(originalText, expectedData);
  authenticityScore += financialAnalysis.score;
  flags.push(...financialAnalysis.flags);
  warnings.push(...financialAnalysis.warnings);
  
  // === 3. GÜVENLİK VE SAHTELİK KONTROLÜ ===
  const securityAnalysis = performSecurityAnalysis(originalText);
  authenticityScore += securityAnalysis.score;
  qualityScore = securityAnalysis.qualityScore;
  flags.push(...securityAnalysis.flags);
  warnings.push(...securityAnalysis.warnings);
  
  // === 4. FORMAT VE YAPISAL ANALİZ ===
  const structuralAnalysis = analyzeDocumentStructure(originalText);
  consistencyScore += structuralAnalysis.score;
  flags.push(...structuralAnalysis.flags);
  
  // === 5. TARİH VE DÖNEM KONTROLÜ ===
  const dateAnalysis = analyzeDateConsistency(originalText, expectedData);
  consistencyScore += dateAnalysis.score;
  flags.push(...dateAnalysis.flags);
  warnings.push(...dateAnalysis.warnings);
  
  // === 6. GENEL DEĞERLENDİRME ===
  const overallReliability = calculateOverallReliability(
    authenticityScore,
    consistencyScore,
    qualityScore,
    flags.length,
    warnings.length
  );
  
  const recommendation = determineRecommendation(overallReliability, flags, warnings);
  const reasoning = generateReasoning(overallReliability, flags, warnings, issues);
  
  return {
    authenticity: {
      score: Math.min(authenticityScore, 1),
      flags,
      confidence: 0.85 // Gelişmiş kural tabanlı analiz yüksek confidence
    },
    dataValidation: {
      extractedData,
      consistency: {
        score: Math.min(consistencyScore, 1),
        issues
      }
    },
    securityAssessment: {
      forgeryRisk: Math.max(0, 1 - authenticityScore),
      tamperingDetected: securityAnalysis.tamperingDetected,
      qualityScore,
      warnings
    },
    overallReliability,
    recommendation,
    reasoning
  };
}

// Gelişmiş veri çıkarma fonksiyonu
function performAdvancedDataExtraction(text: string) {
  const extracted: any = {};
  
  // Gelişmiş isim çıkarma
  extracted.studentName = extractAdvancedStudentName(text);
  
  // Gelişmiş şirket adı çıkarma
  extracted.companyName = extractAdvancedCompanyName(text);
  
  // Gelişmiş miktar çıkarma
  extracted.amount = extractAdvancedAmount(text);
  
  // Gelişmiş tarih çıkarma
  extracted.date = extractAdvancedDate(text);
  
  // IBAN çıkarma
  extracted.iban = extractIBAN(text);
  
  return extracted;
}

// Gelişmiş isim çıkarma
function extractAdvancedStudentName(text: string): string | undefined {
  const nameMatches = text.match(TURKISH_NAME_PATTERNS.name);
  if (!nameMatches) return undefined;
  
  // En uygun ismi seç (en uzun ve yaygın isim içeren)
  return nameMatches.reduce((best, current) => {
    const currentScore = calculateNameScore(current);
    const bestScore = calculateNameScore(best);
    return currentScore > bestScore ? current : best;
  });
}

// İsim skorlama
function calculateNameScore(name: string): number {
  const words = name.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (TURKISH_NAME_PATTERNS.commonNames.includes(word)) score += 2;
    if (TURKISH_NAME_PATTERNS.commonSurnames.includes(word)) score += 2;
    if (word.length > 2) score += 1;
  });
  
  return score;
}

// Gelişmiş şirket adı çıkarma
function extractAdvancedCompanyName(text: string): string | undefined {
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Şirket tipi içeren satırları ara
    for (const type of FINANCIAL_PATTERNS.companyTypes) {
      if (trimmed.toLowerCase().includes(type)) {
        return trimmed;
      }
    }
  }
  
  return undefined;
}

// Gelişmiş miktar çıkarma
function extractAdvancedAmount(text: string): number | undefined {
  const amounts: number[] = [];
  
  FINANCIAL_PATTERNS.amount.forEach(pattern => {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      const amountStr = match[1];
      if (amountStr) {
        const cleanAmount = amountStr.replace(/[.,]/g, (char: string) => char === ',' ? '.' : '');
        const amount = parseFloat(cleanAmount);
        if (!isNaN(amount) && amount > 0) {
          amounts.push(amount);
        }
      }
    }
  });
  
  if (amounts.length === 0) return undefined;
  
  // En büyük miktarı döndür (genellikle toplam tutar)
  return Math.max(...amounts);
}

// Gelişmiş tarih çıkarma
function extractAdvancedDate(text: string): string | undefined {
  const dates: string[] = [];
  
  FINANCIAL_PATTERNS.date.forEach(pattern => {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      try {
        let year = parseInt(match[3]);
        let month = parseInt(match[2]);
        let day = parseInt(match[1]);
        
        // YY formatını YYYY'ye çevir
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        // Tarih geçerliliği kontrolü
        if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          dates.push(dateStr);
        }
      } catch (error) {
        // Geçersiz tarih formatı
      }
    }
  });
  
  if (dates.length === 0) return undefined;
  
  // En güncel tarihi döndür
  return dates.sort().pop();
}

// IBAN çıkarma
function extractIBAN(text: string): string | undefined {
  const ibanMatch = text.match(FINANCIAL_PATTERNS.iban);
  return ibanMatch ? ibanMatch[0].replace(/\s/g, '') : undefined;
}

// Tüm miktarları çıkar
function extractAllAmounts(text: string): number[] {
  const amounts: number[] = [];
  
  FINANCIAL_PATTERNS.amount.forEach(pattern => {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      const amountStr = match[1];
      if (amountStr) {
        const cleanAmount = amountStr.replace(/[.,]/g, (char: string) => char === ',' ? '.' : '');
        const amount = parseFloat(cleanAmount);
        if (!isNaN(amount) && amount > 0) {
          amounts.push(amount);
        }
      }
    }
  });
  
  return amounts;
}

// Tüm tarihleri çıkar
function extractAllDates(text: string): string[] {
  const dates: string[] = [];
  
  FINANCIAL_PATTERNS.date.forEach(pattern => {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      try {
        let year = parseInt(match[3]);
        let month = parseInt(match[2]);
        let day = parseInt(match[1]);
        
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          dates.push(dateStr);
        }
      } catch (error) {
        // Geçersiz tarih
      }
    }
  });
  
  return dates;
}

// Gelişmiş isim eşleştirme
function checkNameMatch(text: string, expectedName: string): { score: number } {
  const cleanText = text.replace(/[^\wçğıöşüÇĞIİÖŞÜ\s]/g, '').toLowerCase();
  const cleanExpected = expectedName.replace(/[^\wçğıöşüÇĞIİÖŞÜ\s]/g, '').toLowerCase();
  
  // Tam eşleşme
  if (cleanText.includes(cleanExpected)) {
    return { score: 1.0 };
  }
  
  // Kelime kelime eşleşme
  const expectedWords = cleanExpected.split(/\s+/);
  const foundWords = expectedWords.filter(word => 
    word.length > 2 && cleanText.includes(word)
  );
  
  const wordScore = foundWords.length / expectedWords.length;
  
  // Karakter benzerlik skoru
  const charScore = calculateSimilarity(cleanExpected, extractBestNameCandidate(cleanText));
  
  return { score: Math.max(wordScore, charScore) };
}

// En iyi isim adayını çıkar
function extractBestNameCandidate(text: string): string {
  const nameMatches = text.match(TURKISH_NAME_PATTERNS.name);
  if (!nameMatches) return '';
  
  return nameMatches.reduce((best, current) => 
    current.length > best.length ? current : best, ''
  );
}

// Karakter benzerlik hesaplama (basit Levenshtein benzeri)
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Basit Levenshtein distance
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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Şirket adı eşleştirme
function checkCompanyMatch(text: string, expectedCompany: string): { score: number } {
  const cleanText = text.replace(/[^\wçğıöşüÇĞIİÖŞÜ\s]/g, '').toLowerCase();
  const cleanExpected = expectedCompany.replace(/[^\wçğıöşüÇĞIİÖŞÜ\s]/g, '').toLowerCase();
  
  if (cleanText.includes(cleanExpected)) {
    return { score: 1.0 };
  }
  
  // Şirket adının anahtar kelimelerini kontrol et
  const companyWords = cleanExpected.split(/\s+/).filter(word => 
    word.length > 2 && !FINANCIAL_PATTERNS.companyTypes.includes(word)
  );
  
  const foundWords = companyWords.filter(word => cleanText.includes(word));
  const score = foundWords.length / Math.max(companyWords.length, 1);
  
  return { score };
}

// Finansal veri analizi
function analyzeFinancialData(text: string, expectedData: any) {
  const flags: string[] = [];
  const warnings: string[] = [];
  let score = 0;
  
  // Para birimi kontrolü
  const hasCurrency = text.includes('₺') || text.includes('TL') || /lira/i.test(text);
  if (hasCurrency) {
    score += 0.1;
  } else {
    warnings.push('Para birimi belirtilmemiş');
  }
  
  // Miktar kontrolü
  const amounts = extractAllAmounts(text);
  if (amounts.length > 0) {
    score += 0.1;
    
    // Beklenen miktarla karşılaştır
    if (expectedData.amount) {
      const closestAmount = amounts.reduce((closest, current) => 
        Math.abs(current - expectedData.amount) < Math.abs(closest - expectedData.amount) 
          ? current : closest
      );
      
      const difference = Math.abs(closestAmount - expectedData.amount);
      const tolerance = expectedData.amount * 0.05; // %5 tolerans
      
      if (difference <= tolerance) {
        score += 0.15;
      } else if (difference <= expectedData.amount * 0.1) {
        score += 0.08;
        warnings.push(`Miktar farklılığı: Beklenen ${expectedData.amount}, Bulunan ${closestAmount}`);
      } else {
        flags.push(`Önemli miktar farklılığı: ${difference} TL`);
      }
    }
  } else {
    flags.push('Geçerli para miktarı bulunamadı');
  }
  
  return { score, flags, warnings };
}

// Güvenlik analizi
function performSecurityAnalysis(text: string) {
  const flags: string[] = [];
  const warnings: string[] = [];
  let score = 0.2; // Başlangıç güvenlik skoru
  let qualityScore = 0.7;
  let tamperingDetected = false;
  
  // Şüpheli kelime kontrolü
  const suspiciousFound = FINANCIAL_PATTERNS.suspiciousWords.filter(word => 
    text.toLowerCase().includes(word)
  );
  
  if (suspiciousFound.length > 0) {
    flags.push(`Şüpheli kelimeler tespit edildi: ${suspiciousFound.join(', ')}`);
    score -= 0.3;
    tamperingDetected = true;
  } else {
    score += 0.1;
  }
  
  // Metin kalitesi analizi
  const textQuality = analyzeTextQuality(text);
  qualityScore = textQuality.score;
  flags.push(...textQuality.flags);
  warnings.push(...textQuality.warnings);
  
  // Tutarlılık kontrolü
  const consistencyCheck = checkTextConsistency(text);
  score += consistencyCheck.score;
  flags.push(...consistencyCheck.flags);
  
  return { score, qualityScore, flags, warnings, tamperingDetected };
}

// Metin kalitesi analizi
function analyzeTextQuality(text: string) {
  const flags: string[] = [];
  const warnings: string[] = [];
  let score = 0.7; // Başlangıç kalite skoru
  
  // Karakter yoğunluğu kontrolü
  const charDensity = text.length / (text.split(/\s+/).length || 1);
  if (charDensity < 3) {
    warnings.push('Düşük karakter yoğunluğu - OCR kalitesi düşük olabilir');
    score -= 0.1;
  }
  
  // Özel karakter oranı
  const specialChars = text.match(/[^\wçğıöşüÇĞIİÖŞÜ\s]/g);
  const specialCharRatio = (specialChars?.length || 0) / text.length;
  
  if (specialCharRatio > 0.3) {
    warnings.push('Yüksek özel karakter oranı - OCR hatası olabilir');
    score -= 0.15;
  }
  
  // Boşluk dağılımı analizi
  const words = text.split(/\s+/);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  
  if (avgWordLength < 2 || avgWordLength > 15) {
    warnings.push('Anormal kelime uzunluğu dağılımı');
    score -= 0.1;
  }
  
  return { score, flags, warnings };
}

// Metin tutarlılığı kontrolü
function checkTextConsistency(text: string) {
  const flags: string[] = [];
  let score = 0;
  
  // Tekrarlanan kelime kontrolü
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = new Map<string, number>();
  
  words.forEach(word => {
    if (word.length > 3) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  });
  
  const repeatedWords = Array.from(wordCount.entries())
    .filter(([word, count]) => count > 2 && word.length > 4);
  
  if (repeatedWords.length > 3) {
    flags.push('Anormal kelime tekrarları tespit edildi');
    score -= 0.1;
  } else {
    score += 0.05;
  }
  
  // Dil tutarlılığı
  const turkishCharRatio = (text.match(/[çğıöşüÇĞIİÖŞÜ]/g)?.length || 0) / text.length;
  if (turkishCharRatio > 0.02) {
    score += 0.05; // Türkçe karakter varlığı pozitif
  }
  
  return { score, flags };
}

// Doküman yapısı analizi
function analyzeDocumentStructure(text: string) {
  const flags: string[] = [];
  let score = 0;
  
  // Standart finansal doküman elementleri
  const hasDate = FINANCIAL_PATTERNS.date.some(pattern => pattern.test(text));
  const hasAmount = FINANCIAL_PATTERNS.amount.some(pattern => pattern.test(text));
  const hasIBAN = FINANCIAL_PATTERNS.iban.test(text);
  
  if (hasDate) score += 0.1;
  else flags.push('Tarih formatı bulunamadı');
  
  if (hasAmount) score += 0.1;
  else flags.push('Para miktarı formatı bulunamadı');
  
  if (hasIBAN) score += 0.05;
  
  // Yapısal tutarlılık
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 5 && lines.length < 50) {
    score += 0.05; // Makul satır sayısı
  } else if (lines.length <= 5) {
    flags.push('Çok az metin satırı - eksik bilgi olabilir');
  }
  
  return { score, flags };
}

// Tarih tutarlılığı analizi
function analyzeDateConsistency(text: string, expectedData: any) {
  const flags: string[] = [];
  const warnings: string[] = [];
  let score = 0;
  
  const dates = extractAllDates(text);
  
  if (dates.length > 0) {
    score += 0.1;
    
    // Beklenen ay/yıl kontrolü
    if (expectedData.month && expectedData.year) {
      const validDates = dates.filter(date => {
        const parsedDate = new Date(date);
        return parsedDate.getFullYear() === expectedData.year &&
               (parsedDate.getMonth() + 1) === expectedData.month;
      });
      
      if (validDates.length > 0) {
        score += 0.15;
      } else {
        const closeMonths = dates.filter(date => {
          const parsedDate = new Date(date);
          return parsedDate.getFullYear() === expectedData.year;
        });
        
        if (closeMonths.length > 0) {
          warnings.push('Tarih yıl olarak doğru ancak ay farklı');
          score += 0.05;
        } else {
          flags.push('Beklenen dönemle uyumsuz tarih');
        }
      }
    }
  } else {
    flags.push('Geçerli tarih formatı bulunamadı');
  }
  
  return { score, flags, warnings };
}

// Genel güvenirlik hesaplama
function calculateOverallReliability(
  authenticityScore: number,
  consistencyScore: number,
  qualityScore: number,
  flagCount: number,
  warningCount: number
): number {
  const baseScore = (authenticityScore * 0.4 + consistencyScore * 0.3 + qualityScore * 0.3);
  const penaltyScore = (flagCount * 0.1 + warningCount * 0.05);
  
  return Math.max(0, Math.min(1, baseScore - penaltyScore));
}

// Öneri belirleme
function determineRecommendation(
  reliability: number,
  flags: string[],
  warnings: string[]
): 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW' {
  if (flags.length > 3 || reliability < 0.3) {
    return 'REJECT';
  } else if (flags.length > 1 || warnings.length > 3 || reliability < 0.6) {
    return 'MANUAL_REVIEW';
  } else {
    return 'APPROVE';
  }
}

// Gerekçe oluşturma
function generateReasoning(
  reliability: number,
  flags: string[],
  warnings: string[],
  issues: string[]
): string[] {
  const reasoning: string[] = [];
  
  reasoning.push(`Genel güvenirlik skoru: ${Math.round(reliability * 100)}%`);
  
  if (flags.length === 0) {
    reasoning.push('Kritik sorun tespit edilmedi');
  } else {
    reasoning.push(`${flags.length} kritik sorun tespit edildi`);
  }
  
  if (warnings.length > 0) {
    reasoning.push(`${warnings.length} uyarı tespit edildi`);
  }
  
  if (reliability > 0.8) {
    reasoning.push('Yüksek güvenirlik - otomatik onay önerisi');
  } else if (reliability > 0.6) {
    reasoning.push('Orta güvenirlik - dikkatli inceleme önerisi');
  } else {
    reasoning.push('Düşük güvenirlik - manuel inceleme gerekli');
  }
  
  return reasoning;
}

// Basit yardımcı fonksiyonlar (eski API uyumluluğu için)
function extractStudentName(text: string, expected?: string): string | undefined {
  return expected && text.toLowerCase().includes(expected.toLowerCase()) ? expected : undefined;
}

function extractCompanyName(text: string, expected?: string): string | undefined {
  return expected && text.toLowerCase().includes(expected.toLowerCase()) ? expected : undefined;
}

function extractAmount(text: string): number | undefined {
  return extractAdvancedAmount(text);
}

function extractDate(text: string): string | undefined {
  return extractAdvancedDate(text);
}

// Basit fallback analizi (eski fonksiyon uyumluluğu için)
function performFallbackAnalysis(
  ocrText: string,
  expectedData: any
): AIAnalysisResult {
  return performAdvancedRuleBasedAnalysis(ocrText, expectedData);
}

// Toplu analiz için batch processing
export async function analyzeBatch(
  documents: Array<{
    id: string;
    ocrText: string;
    expectedData: any;
  }>
): Promise<Array<{ id: string; analysis: AIAnalysisResult }>> {
  
  const results = [];
  
  for (const doc of documents) {
    try {
      const analysis = await analyzeWithAI(doc.ocrText, doc.expectedData);
      results.push({ id: doc.id, analysis });
    } catch (error) {
      console.error(`❌ AI: Batch analysis failed for document ${doc.id}:`, error);
      results.push({
        id: doc.id,
        analysis: performFallbackAnalysis(doc.ocrText, doc.expectedData)
      });
    }
  }
  
  return results;
}