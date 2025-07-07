export type Dekont = {
  id: string;
  staj_id: string;
  miktar: number | null;
  ay: string;
  yil: string;
  odeme_tarihi: string | null;
  dosya_url: string | null;
  onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi';
  aciklama?: string;
  stajlar?: {
    ogrenciler?: {
      ad: string;
      soyad: string;
      sinif: string;
      no: string;
      alan?: {
        ad: string;
      };
    }
  };
  gonderen: 'isletme' | 'ogretmen';
  ogrenci_adi?: string;
}

export interface DekontFormData {
  staj_id: string
  miktar?: number
  dosya?: File
  aciklama?: string
  ay: string
  yil: string
  odeme_tarihi?: string
  isletme_id?: string
  ocr_confidence?: number
  ocr_raw_text?: string
  ocr_validation_warnings?: string[]
}

export interface DekontModalProps {
  isOpen: boolean
  onClose: () => void
  dekont: Dekont | null
  onDownload?: (url: string) => void
}

export interface DekontListProps {
  dekontlar: Dekont[]
  onDekontSelect: (dekont: Dekont) => void
  onDekontDelete?: (dekont: Dekont) => void
  isLoading?: boolean
}

export interface OCRValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
}

export interface DekontOCRData {
  miktar?: number
  tarih?: string
  aciklama?: string
  banka?: string
  hesapNo?: string
  rawText: string
  confidence: number
  validationResult: OCRValidationResult
}