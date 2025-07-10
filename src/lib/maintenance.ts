import { supabase } from './supabase'

export interface MaintenanceStatus {
  isMaintenanceMode: boolean
  error?: string
}

export async function checkMaintenanceMode(): Promise<MaintenanceStatus> {
  try {
    // Önce system_settings tablosundan direkt çekmeyi dene
    const { data: settingData, error: directError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single()

    if (!directError && settingData) {
      return { isMaintenanceMode: settingData.value === 'true' }
    }

    // Tablo yoksa veya kayıt yoksa RPC deneyelim
    const { data, error } = await supabase.rpc('get_system_setting', {
      p_setting_key: 'maintenance_mode'
    })

    if (error) {
      console.error('Bakım modu kontrolü hatası (RPC):', error)
      // RPC de çalışmıyorsa varsayılan false döndür
      return { isMaintenanceMode: false }
    }

    return { isMaintenanceMode: data === 'true' }
  } catch (error) {
    console.error('Bakım modu kontrolü hatası:', error)
    // Herhangi bir hata durumunda güvenli değer döndür
    return { isMaintenanceMode: false }
  }
}