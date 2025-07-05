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
  staj_id: number
  tutar?: number
  dosya?: File
  aciklama?: string
  ay: string
  yil: string
  odeme_tarihi?: string
  isletme_id?: string
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