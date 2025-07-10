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
    // Önce doğru kolon adlarıyla deneyelim 
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')

    if (error) {
      console.error('Sistem ayarları alınamadı (key,value):', error)
      
      // Alternatif kolon adlarını dene
      const { data: altData, error: altError } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')

      if (altError) {
        console.error('Sistem ayarları alınamadı (setting_key,setting_value):', altError)
        return defaultSettings
      }

      if (!altData) {
        return defaultSettings
      }

      const settingsMap = altData.reduce((acc: any, setting: any) => {
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
    }

    if (!data) {
      return defaultSettings
    }

    const settingsMap = data.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value
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
    // Önce system_settings tablosundan direkt çekmeyi dene
    const { data: settingData, error: directError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'school_name')
      .single()

    if (!directError && settingData?.value) {
      return settingData.value
    }

    // Direkt erişim çalışmazsa RPC deneyelim
    const { data } = await supabase.rpc('get_system_setting', {
      p_setting_key: 'school_name'
    })
    return data || 'Hüsniye Özdilek MTAL'
  } catch (error) {
    console.error('Okul adı alınamadı:', error)
    return 'Hüsniye Özdilek MTAL'
  }
}