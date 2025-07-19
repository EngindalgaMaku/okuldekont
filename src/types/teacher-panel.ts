// TypeScript Arayüzleri
export interface Ogrenci {
  id: string;
  ad: string;
  soyad: string;
  no: string;
  sinif: string;
  alan: string;
  staj_id?: string;
  baslangic_tarihi: string;
}

export interface Isletme {
  id: string;
  ad: string;
  ogrenciler: Ogrenci[];
  yukleyen_kisi: string;
  company_type?: 'tech' | 'accounting' | 'other';
  total_students?: number;
  color_scheme?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  display_order?: number;
  is_even?: boolean;
  separator_color?: string;
}

export interface Dekont {
  id: number;
  isletme_ad: string;
  ogrenci_ad: string;
  miktar: number | null;
  odeme_tarihi: string;
  onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi';
  ay: number;
  yil: number;
  dosya_url?: string;
  aciklama?: string;
  red_nedeni?: string;
  yukleyen_kisi: string;
  created_at?: string;
}

export interface Belge {
  id: number;
  isletme_ad: string;
  dosya_adi: string;
  dosya_url: string;
  belge_turu: string;
  yukleme_tarihi: string;
  yukleyen_kisi?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  onaylanma_tarihi?: string;
  red_nedeni?: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  sent_by: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  name: string;
  surname: string;
  ad?: string;
  soyad?: string;
}

export interface ErrorModal {
  isOpen: boolean;
  title: string;
  message: string;
}

export interface SuccessModal {
  isOpen: boolean;
  title: string;
  message: string;
}

export interface CompanyStyles {
  border: string;
  background: string;
  iconBg: string;
  iconColor: string;
}

export interface StatusInfo {
  text: string;
  icon: any;
  color: string;
  bg: string;
}