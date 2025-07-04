export interface Dekont {
  id: number
  isletme_id: number
  staj_id: number
  odeme_tarihi: string
  tutar: number
  dosya_url?: string
  aciklama?: string
  ay: string
  yil: number
  onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi'
  created_at: string
  stajlar: {
    ogrenciler: {
      ad: string
      soyad: string
      sinif: string
      no: string
    } | null
  }
  isletmeler: {
    ad: string
  }
  yukleyen_rolu?: string
  yukleyen_id?: string
  yukleyen_adi?: string
  // Eski kodla uyumluluk için
  tarih?: string
  miktar?: number
  ogrenci_adi?: string
  odeme_son_tarihi?: string
  dekont_dosyasi?: string
}

export interface Ogretmen {
  id: number
  ad: string
  soyad: string
}

export interface Isletme {
  id: number
  ad: string
  yetkili_kisi: string
  ogrenci_sayisi: number
}

export interface Stajyer {
  id: number
  ad: string
  soyad: string
  sinif: string
  alan: string
  no: string
  isletme: {
    id: number
    ad: string
    yetkili_kisi: string
  }
  baslangic_tarihi: string
  bitis_tarihi: string
  staj_id: number
}

export interface IsletmeBelgesi {
  id: number
  isletme_id: number
  ogretmen_id: number
  dosya_url: string
  aciklama: string
  yuklenme_tarihi: string
}

export type ActiveTab = 'isletmeler' | 'dekontlar' 