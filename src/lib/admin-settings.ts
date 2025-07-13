import { supabase } from './supabase'

export async function getSystemSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
    
    if (error) throw error
    
    const settingsMap: { [key: string]: any } = {}
    if (data) {
      for (const setting of data) {
        settingsMap[setting.key] = setting.value
      }
    }
    
    return {
      showPerformanceMonitoring: settingsMap.show_performance_monitoring === 'true',
      maintenanceMode: settingsMap.maintenance_mode === 'true',
      schoolName: settingsMap.school_name || 'Hüsniye Özdilek MTAL',
      autoApproval: settingsMap.auto_approval === 'true',
      emailNotifications: settingsMap.email_notifications === 'true'
    }
  } catch (error) {
    console.error('System settings fetch error:', error)
    return {
      showPerformanceMonitoring: false,
      maintenanceMode: false,
      schoolName: 'Hüsniye Özdilek MTAL',
      autoApproval: false,
      emailNotifications: true
    }
  }
}

export async function isPerformanceMonitoringEnabled(): Promise<boolean> {
  const settings = await getSystemSettings()
  return settings.showPerformanceMonitoring
}