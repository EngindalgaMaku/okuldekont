import { prisma } from './prisma'

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
    schoolName: 'Okul Adı',
    emailNotifications: true,
    autoApproval: false,
    maxFileSize: 5,
    allowedFileTypes: 'pdf,jpg,png',
    maintenanceMode: false
  }

  try {
    // Sistem ayarlarını Prisma ile al
    const settings = await prisma.systemSetting.findMany({
      select: {
        key: true,
        value: true
      }
    })

    if (!settings || settings.length === 0) {
      return defaultSettings
    }

    const settingsMap = settings.reduce((acc: any, setting: any) => {
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
    // Okul adını Prisma ile al
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'school_name' },
      select: { value: true }
    })

    return setting?.value || 'Okul Adı'
  } catch (error) {
    console.error('Okul adı alınamadı:', error)
    return 'Okul Adı'
  }
}

export async function updateSystemSetting(key: string, value: string): Promise<boolean> {
  try {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
    return true
  } catch (error) {
    console.error('Sistem ayarı güncellenemedi:', error)
    return false
  }
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<boolean> {
  try {
    const updates = []

    if (settings.schoolName !== undefined) {
      updates.push(updateSystemSetting('school_name', settings.schoolName))
    }
    if (settings.emailNotifications !== undefined) {
      updates.push(updateSystemSetting('email_notifications', settings.emailNotifications.toString()))
    }
    if (settings.autoApproval !== undefined) {
      updates.push(updateSystemSetting('auto_approval', settings.autoApproval.toString()))
    }
    if (settings.maxFileSize !== undefined) {
      updates.push(updateSystemSetting('max_file_size', settings.maxFileSize.toString()))
    }
    if (settings.allowedFileTypes !== undefined) {
      updates.push(updateSystemSetting('allowed_file_types', settings.allowedFileTypes))
    }
    if (settings.maintenanceMode !== undefined) {
      updates.push(updateSystemSetting('maintenance_mode', settings.maintenanceMode.toString()))
    }

    await Promise.all(updates)
    return true
  } catch (error) {
    console.error('Sistem ayarları güncellenemedi:', error)
    return false
  }
}