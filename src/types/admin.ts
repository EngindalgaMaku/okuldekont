export interface AdminUser {
  id: string // UUID from Supabase auth
  ad: string
  soyad: string
  email: string
  yetki_seviyesi: 'super_admin' | 'admin' | 'operator'
  aktif: boolean
  created_at: string
  updated_at: string
}

export interface CreateAdminUser {
  ad: string
  soyad: string
  email: string
  yetki_seviyesi: 'super_admin' | 'admin' | 'operator'
}

export interface UpdateAdminUser {
  ad: string
  soyad: string
  email: string
  yetki_seviyesi: 'super_admin' | 'admin' | 'operator'
  aktif: boolean
}

export const YetkiSeviyeleri = {
  'super_admin': {
    label: 'K. Müd. Yard.',
    description: 'Tüm yetkilere sahip, diğer adminleri yönetebilir',
    color: 'bg-red-100 text-red-800'
  },
  'admin': {
    label: 'Admin',
    description: 'Çoğu işlemi yapabilir, admin yönetimi hariç',
    color: 'bg-blue-100 text-blue-800'
  },
  'operator': {
    label: 'Admin',
    description: 'Temel işlemleri yapabilir, kısıtlı yetkiler',
    color: 'bg-green-100 text-green-800'
  }
} as const