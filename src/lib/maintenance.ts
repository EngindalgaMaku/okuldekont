import { supabase } from './supabase'

export interface MaintenanceStatus {
  isMaintenanceMode: boolean
  error?: string
}

export async function checkMaintenanceMode(): Promise<MaintenanceStatus> {
  try {
    const { data, error } = await supabase.rpc('get_system_setting', {
      p_setting_key: 'maintenance_mode'
    })

    if (error) {
      console.error('Bakım modu kontrolü hatası:', error)
      return { isMaintenanceMode: false, error: error.message }
    }

    return { isMaintenanceMode: data === 'true' }
  } catch (error) {
    console.error('Bakım modu kontrolü hatası:', error)
    return { isMaintenanceMode: false, error: (error as Error).message }
  }
}