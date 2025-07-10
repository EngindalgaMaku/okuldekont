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
          aciklama?: string | null
          aktif?: boolean
          created_at?: string
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
      siniflar: {
        Row: {
          id: string
          ad: string
          alan_id: string
          ogretmen_id?: string | null
          created_at?: string
        }
        Insert: {
          id?: string
          ad: string
          alan_id: string
          ogretmen_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ad?: string
          alan_id?: string
          ogretmen_id?: string | null
          created_at?: string
        }
      }
      ogretmenler: {
        Row: {
          id: string
          ad: string
          soyad: string
          pin: string
          telefon?: string | null
          email?: string | null
          alan_id?: string | null
          aktif?: boolean
          created_at?: string
        }
        Insert: {
          id?: string
          ad: string
          soyad: string
          pin: string
          telefon?: string | null
          email?: string | null
          alan_id?: string | null
          aktif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          ad?: string
          soyad?: string
          pin?: string
          telefon?: string | null
          email?: string | null
          alan_id?: string | null
          aktif?: boolean
          created_at?: string
        }
      }
      isletmeler: {
        Row: {
          id: string
          ad: string
          yetkili_kisi: string
          pin: string
          ogretmen_id?: string | null
          telefon?: string | null
          email?: string | null
          adres?: string | null
          vergi_no?: string | null
          created_at?: string
        }
        Insert: {
          id?: string
          ad: string
          yetkili_kisi: string
          pin: string
          ogretmen_id?: string | null
          telefon?: string | null
          email?: string | null
          adres?: string | null
          vergi_no?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ad?: string
          yetkili_kisi?: string
          pin?: string
          ogretmen_id?: string | null
          telefon?: string | null
          email?: string | null
          adres?: string | null
          vergi_no?: string | null
          created_at?: string
        }
      }
      ogrenciler: {
        Row: {
          id: string
          ad: string
          soyad: string
          no?: string | null
          sinif: string
          alan_id: string
          isletme_id?: string | null
          tc_no?: string | null
          telefon?: string | null
          email?: string | null
          veli_adi?: string | null
          veli_telefon?: string | null
          created_at?: string
        }
        Insert: {
          id?: string
          ad: string
          soyad: string
          no?: string | null
          sinif: string
          alan_id: string
          isletme_id?: string | null
          tc_no?: string | null
          telefon?: string | null
          email?: string | null
          veli_adi?: string | null
          veli_telefon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ad?: string
          soyad?: string
          no?: string | null
          sinif?: string
          alan_id?: string
          isletme_id?: string | null
          tc_no?: string | null
          telefon?: string | null
          email?: string | null
          veli_adi?: string | null
          veli_telefon?: string | null
          created_at?: string
        }
      }
      stajlar: {
        Row: {
          id: string
          ogrenci_id: string
          isletme_id: string
          ogretmen_id: string
          egitim_yili_id: string
          baslangic_tarihi: string
          bitis_tarihi: string
          fesih_tarihi?: string | null
          durum: 'aktif' | 'tamamlandi' | 'iptal'
          created_at: string
        }
        Insert: {
          id?: string
          ogrenci_id: string
          isletme_id: string
          ogretmen_id: string
          egitim_yili_id: string
          baslangic_tarihi: string
          bitis_tarihi: string
          fesih_tarihi?: string | null
          durum?: 'aktif' | 'tamamlandi' | 'iptal'
          created_at?: string
        }
        Update: {
          id?: string
          ogrenci_id?: string
          isletme_id?: string
          ogretmen_id?: string
          egitim_yili_id?: string
          baslangic_tarihi?: string
          bitis_tarihi?: string
          fesih_tarihi?: string | null
          durum?: 'aktif' | 'tamamlandi' | 'iptal'
          created_at?: string
        }
      }
      dekontlar: {
        Row: {
          id: string
          staj_id: string
          isletme_id: string
          ogretmen_id: string
          ogrenci_id?: string | null
          miktar?: number | null
          odeme_tarihi: string
          odeme_son_tarihi: string
          dekont_dosyasi?: string | null
          dosya_url?: string | null
          onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi' | 'BEKLEMEDE' | 'ONAYLANDI' | 'REDDEDILDI'
          ay: number
          yil: number
          onaylayan_ogretmen_id?: string | null
          onay_tarihi?: string | null
          red_nedeni?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          staj_id: string
          isletme_id: string
          ogretmen_id: string
          ogrenci_id?: string | null
          miktar?: number | null
          odeme_tarihi: string
          odeme_son_tarihi?: string
          dekont_dosyasi?: string | null
          dosya_url?: string | null
          onay_durumu?: 'bekliyor' | 'onaylandi' | 'reddedildi' | 'BEKLEMEDE' | 'ONAYLANDI' | 'REDDEDILDI'
          ay?: number
          yil?: number
          onaylayan_ogretmen_id?: string | null
          onay_tarihi?: string | null
          red_nedeni?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          staj_id?: string
          isletme_id?: string
          ogretmen_id?: string
          ogrenci_id?: string | null
          miktar?: number | null
          odeme_tarihi?: string
          odeme_son_tarihi?: string
          dekont_dosyasi?: string | null
          dosya_url?: string | null
          onay_durumu?: 'bekliyor' | 'onaylandi' | 'reddedildi' | 'BEKLEMEDE' | 'ONAYLANDI' | 'REDDEDILDI'
          ay?: number
          yil?: number
          onaylayan_ogretmen_id?: string | null
          onay_tarihi?: string | null
          red_nedeni?: string | null
          created_at?: string
        }
      }
      egitim_yillari: {
        Row: {
          id: string
          yil: string
          aktif: boolean
          created_at?: string
        }
        Insert: {
          id?: string
          yil: string
          aktif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          yil?: string
          aktif?: boolean
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          id: number
          key?: string
          setting_key?: string
          value?: string | null
          setting_value?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: number
          key?: string
          setting_key?: string
          value?: string | null
          setting_value?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          key?: string
          setting_key?: string
          value?: string | null
          setting_value?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      isletme_koordinatorler: {
        Row: {
          id: string
          isletme_id: string
          alan_id: string
          ogretmen_id: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          isletme_id: string
          alan_id: string
          ogretmen_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          isletme_id?: string
          alan_id?: string
          ogretmen_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      isletme_giris_denemeleri: {
        Row: {
          id: string
          isletme_id: string
          giris_tarihi?: string
          ip_adresi?: string | null
          user_agent?: string | null
          basarili?: boolean
          kilitlenme_tarihi?: string | null
        }
        Insert: {
          id?: string
          isletme_id: string
          giris_tarihi?: string
          ip_adresi?: string | null
          user_agent?: string | null
          basarili?: boolean
          kilitlenme_tarihi?: string | null
        }
        Update: {
          id?: string
          isletme_id?: string
          giris_tarihi?: string
          ip_adresi?: string | null
          user_agent?: string | null
          basarili?: boolean
          kilitlenme_tarihi?: string | null
        }
      }
      ogretmen_giris_denemeleri: {
        Row: {
          id: string
          ogretmen_id: string
          giris_tarihi?: string
          ip_adresi?: string | null
          user_agent?: string | null
          basarili?: boolean
          kilitlenme_tarihi?: string | null
        }
        Insert: {
          id?: string
          ogretmen_id: string
          giris_tarihi?: string
          ip_adresi?: string | null
          user_agent?: string | null
          basarili?: boolean
          kilitlenme_tarihi?: string | null
        }
        Update: {
          id?: string
          ogretmen_id?: string
          giris_tarihi?: string
          ip_adresi?: string | null
          user_agent?: string | null
          basarili?: boolean
          kilitlenme_tarihi?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_isletme_pin_giris: {
        Args: {
          p_isletme_id: string
          p_girilen_pin: string
          p_ip_adresi: string
          p_user_agent: string
        }
        Returns: Json
      }
      check_ogretmen_pin_giris: {
        Args: {
          p_ogretmen_id: string
          p_girilen_pin: string
          p_ip_adresi: string
          p_user_agent: string
        }
        Returns: Json
      }
      get_system_setting: {
        Args: {
          p_setting_key: string
        }
        Returns: string
      }
      update_system_setting: {
        Args: {
          p_setting_key: string
          p_setting_value: string
        }
        Returns: boolean
      }
      exec_sql: {
        Args: {
          query: string
        }
        Returns: Json
      }
    }
    Enums: {
      staj_durum: 'aktif' | 'tamamlandi' | 'iptal'
      dekont_onay_durum: 'bekliyor' | 'onaylandi' | 'reddedildi'
    }
  }
}