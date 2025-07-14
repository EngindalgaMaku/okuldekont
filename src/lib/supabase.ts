import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug: Environment variable'ları kontrol et
console.log('🔐 Supabase Environment Check:')
console.log('URL:', supabaseUrl)
console.log('URL Protocol:', supabaseUrl ? new URL(supabaseUrl).protocol : 'undefined')
console.log('Key exists:', !!supabaseAnonKey)
console.log('Key length:', supabaseAnonKey?.length || 0)

// HTTPS kontrolü ve uyarı
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error('🚨 CRITICAL: Supabase URL must use HTTPS in production!')
  console.error('Current URL:', supabaseUrl)
  console.error('Expected format: https://your-project.supabase.co')
}

// Environment variable'ları doğrula
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing!')
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing!')
}

// Tüm işlemler için standart, güvenli client'ı kullan
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
      alanlar: {
        Row: {
          id: string
          ad: string
          aciklama: string | null
          aktif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          ad: string
          aciklama?: string | null
          aktif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          ad?: string
          aciklama?: string | null
          aktif?: boolean
          created_at?: string
        }
      }
      ogretmenler: {
        Row: {
          id: string
          ad: string
          soyad: string
          email: string | null
          telefon: string | null
          alan_id: string | null
          aktif: boolean
          pin: string
          created_at: string
        }
        Insert: {
          id?: string
          ad: string
          soyad: string
          email?: string | null
          telefon?: string | null
          alan_id?: string | null
          aktif?: boolean
          pin: string
          created_at?: string
        }
        Update: {
          id?: string
          ad?: string
          soyad?: string
          email?: string | null
          telefon?: string | null
          alan_id?: string | null
          aktif?: boolean
          pin?: string
          created_at?: string
        }
      }
      isletmeler: {
        Row: {
          id: string
          ad: string
          yetkili_kisi: string
          telefon: string
          email: string
          adres: string
          vergi_no: string
          pin_kodu: string | null
          koordinator_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ad: string
          yetkili_kisi: string
          telefon: string
          email: string
          adres: string
          vergi_no: string
          pin_kodu?: string | null
          koordinator_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ad?: string
          yetkili_kisi?: string
          telefon?: string
          email?: string
          adres?: string
          vergi_no?: string
          pin_kodu?: string | null
          koordinator_id?: string | null
          created_at?: string
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
          created_at: string
          updated_at: string
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
          id: number
          staj_id: string
          miktar: number
          odeme_tarihi: string
          dekont_dosyasi: string | null
          onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi'
          created_at: string
        }
        Insert: {
          id?: number
          staj_id: string
          miktar: number
          odeme_tarihi: string
          dekont_dosyasi?: string | null
          onay_durumu?: 'bekliyor' | 'onaylandi' | 'reddedildi'
          created_at?: string
        }
        Update: {
          id?: number
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