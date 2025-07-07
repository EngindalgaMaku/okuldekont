import { supabase } from './supabase'

export interface SystemSettings {
  schoolName: string
  emailNotifications: boolean
  autoApproval: boolean
  maxFileSize: number
  allowedFileTypes: string
  maintenanceMode: boolean
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const defaultSettings: SystemSettings = {
    schoolName: 'Hüsniye Özdilek MTAL',
    emailNotifications: true,
    autoApproval: false,
    maxFileSize: 5,
    allowedFileTypes: 'pdf,jpg,png',
    maintenanceMode: false
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')

    if (error) {
      console.error('Sistem ayarları alınamadı:', error)
      return defaultSettings
    }

    if (!data) {
      return defaultSettings
    }

    const settingsMap = data.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {})

    return {
      schoolName: settingsMap.school_name || defaultSettings.schoolName,
      emailNotifications: settingsMap.email_notifications === 'true',
      autoApproval: settingsMap.auto_approval === 'true',
      maxFileSize: parseInt(settingsMap.max_file_size || '5'),
      allowedFileTypes: settingsMap.allowed_file_types || defaultSettings.allowedFileTypes,
      maintenanceMode: settingsMap.maintenance_mode === 'true'
    }
  } catch (error) {
    console.error('Sistem ayarları alınırken hata:', error)
    return defaultSettings
  }
}

export async function getSchoolName(): Promise<string> {
  try {
    const { data } = await supabase.rpc('get_system_setting', {
      p_setting_key: 'school_name'
    })
    return data || 'Hüsniye Özdilek MTAL'
  } catch (error) {
    console.error('Okul adı alınamadı:', error)
    return 'Hüsniye Özdilek MTAL'
  }
}