import { prisma } from './prisma'

export interface MaintenanceStatus {
  isMaintenanceMode: boolean
  error?: string
}

export async function checkMaintenanceMode(): Promise<MaintenanceStatus> {
  try {
    // 5 saniye timeout ile sistem ayarlarını kontrol et
    const timeoutPromise = new Promise<MaintenanceStatus>((_, reject) => {
      setTimeout(() => reject(new Error('Maintenance check timeout')), 5000)
    })

    const checkPromise = (async () => {
      // system_settings tablosundan maintenance_mode ayarını çek
      const settingData = await prisma.systemSetting.findUnique({
        where: { key: 'maintenance_mode' },
        select: { value: true }
      })

      if (settingData) {
        return { isMaintenanceMode: settingData.value === 'true' }
      }

      // Ayar bulunamadıysa varsayılan false döndür
      return { isMaintenanceMode: false }
    })()

    return await Promise.race([checkPromise, timeoutPromise])
  } catch (error) {
    console.error('Bakım modu kontrolü hatası:', error)
    // Herhangi bir hata durumunda güvenli değer döndür (bakım modu kapalı)
    return { isMaintenanceMode: false }
  }
}