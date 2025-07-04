export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      siniflar: {
        Row: {
          id: string
          ad: string
          alan_id: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          ad: string
          alan_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ad?: string
          alan_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      ogrenciler: {
        Row: {
          id: string
          ad: string
          soyad: string
          numara: string
          sinif: string
          alan_id: string
          isletme_id: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          ad: string
          soyad: string
          numara: string
          sinif: string
          alan_id: string
          isletme_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ad?: string
          soyad?: string
          numara?: string
          sinif?: string
          alan_id?: string
          isletme_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stajlar: {
        Row: {
          id: string
          ogrenci_id: string
          isletme_id: string
          baslangic_tarihi: string
          bitis_tarihi: string
          durum: 'aktif' | 'tamamlandi' | 'iptal'
          created_at: string
        }
        Insert: {
          id?: string
          ogrenci_id: string
          isletme_id: string
          baslangic_tarihi: string
          bitis_tarihi: string
          durum?: 'aktif' | 'tamamlandi' | 'iptal'
          created_at?: string
        }
        Update: {
          id?: string
          ogrenci_id?: string
          isletme_id?: string
          baslangic_tarihi?: string
          bitis_tarihi?: string
          durum?: 'aktif' | 'tamamlandi' | 'iptal'
          created_at?: string
        }
      }
      dekontlar: {
        Row: {
          id: string
          staj_id: string
          miktar: number
          odeme_tarihi: string
          dekont_dosyasi: string | null
          onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi'
          created_at: string
        }
        Insert: {
          id?: string
          staj_id: string
          miktar: number
          odeme_tarihi: string
          dekont_dosyasi?: string | null
          onay_durumu?: 'bekliyor' | 'onaylandi' | 'reddedildi'
          created_at?: string
        }
        Update: {
          id?: string
          staj_id?: string
          miktar?: number
          odeme_tarihi?: string
          dekont_dosyasi?: string | null
          onay_durumu?: 'bekliyor' | 'onaylandi' | 'reddedildi'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 