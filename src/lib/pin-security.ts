import { prisma } from '@/lib/prisma'

export const PIN_SECURITY_CONFIG = {
  MAX_ATTEMPTS: 4,
  LOCK_DURATION_MINUTES: 30, // 30 dakika bloke süresi
  ATTEMPT_WINDOW_MINUTES: 15, // 15 dakika içindeki denemeler sayılır
}

export interface PinSecurityStatus {
  isLocked: boolean
  remainingAttempts: number
  lockStartTime?: Date
  lockEndTime?: Date
  canAttempt: boolean
}

export interface PinAttemptResult {
  success: boolean
  securityStatus: PinSecurityStatus
  message: string
}

/**
 * PIN deneme kaydı oluşturur ve güvenlik durumunu günceller
 */
export async function recordPinAttempt(
  entityType: 'teacher' | 'company',
  entityId: string,
  successful: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<PinAttemptResult> {
  const now = new Date()
  
  // PIN attempt kaydını oluştur
  await prisma.pinAttempt.create({
    data: {
      entityType,
      entityId,
      successful,
      ipAddress,
      userAgent,
      attemptedAt: now,
      ...(entityType === 'teacher' ? { teacherId: entityId } : { companyId: entityId })
    }
  })

  if (successful) {
    // Başarılı giriş durumunda failed attempts'i sıfırla ve bloke açık
    await resetFailedAttempts(entityType, entityId)
    return {
      success: true,
      securityStatus: {
        isLocked: false,
        remainingAttempts: PIN_SECURITY_CONFIG.MAX_ATTEMPTS,
        canAttempt: true
      },
      message: 'Giriş başarılı'
    }
  }

  // Başarısız denemede güvenlik durumunu kontrol et ve güncelle
  const securityStatus = await updateSecurityStatus(entityType, entityId)
  
  return {
    success: false,
    securityStatus,
    message: securityStatus.isLocked 
      ? `Çok fazla hatalı deneme. Hesap ${PIN_SECURITY_CONFIG.LOCK_DURATION_MINUTES} dakika bloke edildi.`
      : `Hatalı PIN. ${securityStatus.remainingAttempts} deneme hakkınız kaldı.`
  }
}

/**
 * Güvenlik durumunu kontrol eder ve günceller
 */
export async function updateSecurityStatus(
  entityType: 'teacher' | 'company',
  entityId: string
): Promise<PinSecurityStatus> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - PIN_SECURITY_CONFIG.ATTEMPT_WINDOW_MINUTES * 60 * 1000)

  // Son X dakika içindeki başarısız denemeleri say
  const recentFailedAttempts = await prisma.pinAttempt.count({
    where: {
      entityType,
      entityId,
      successful: false,
      attemptedAt: {
        gte: windowStart
      }
    }
  })

  const profile = await getEntityProfile(entityType, entityId)
  if (!profile) {
    throw new Error('Entity not found')
  }

  // Bloke durumu kontrolü
  let isLocked = false
  let lockEndTime: Date | undefined

  if (profile.isLocked && profile.lockStartTime) {
    lockEndTime = new Date(profile.lockStartTime.getTime() + PIN_SECURITY_CONFIG.LOCK_DURATION_MINUTES * 60 * 1000)
    isLocked = now < lockEndTime
  }

  // Eğer bloke süresi dolmuşsa bloke açık
  if (profile.isLocked && !isLocked) {
    await updateEntityProfile(entityType, entityId, {
      isLocked: false,
      lockStartTime: null,
      failedAttempts: 0
    })
  }

  // Eğer maksimum deneme sayısına ulaşıldıysa bloke et
  if (!isLocked && recentFailedAttempts >= PIN_SECURITY_CONFIG.MAX_ATTEMPTS) {
    await updateEntityProfile(entityType, entityId, {
      isLocked: true,
      lockStartTime: now,
      failedAttempts: recentFailedAttempts,
      lastFailedAttempt: now
    })
    
    isLocked = true
    lockEndTime = new Date(now.getTime() + PIN_SECURITY_CONFIG.LOCK_DURATION_MINUTES * 60 * 1000)
  } else if (!isLocked) {
    // Bloke değilse failed attempts sayısını güncelle
    await updateEntityProfile(entityType, entityId, {
      failedAttempts: recentFailedAttempts,
      lastFailedAttempt: recentFailedAttempts > 0 ? now : null
    })
  }

  return {
    isLocked,
    remainingAttempts: Math.max(0, PIN_SECURITY_CONFIG.MAX_ATTEMPTS - recentFailedAttempts),
    lockStartTime: profile.lockStartTime,
    lockEndTime,
    canAttempt: !isLocked
  }
}

/**
 * Güvenlik durumunu kontrol eder (güncelleme yapmadan)
 */
export async function checkSecurityStatus(
  entityType: 'teacher' | 'company',
  entityId: string
): Promise<PinSecurityStatus> {
  const profile = await getEntityProfile(entityType, entityId)
  if (!profile) {
    throw new Error('Entity not found')
  }

  const now = new Date()
  let isLocked = false
  let lockEndTime: Date | undefined

  if (profile.isLocked && profile.lockStartTime) {
    lockEndTime = new Date(profile.lockStartTime.getTime() + PIN_SECURITY_CONFIG.LOCK_DURATION_MINUTES * 60 * 1000)
    isLocked = now < lockEndTime
  }

  // Son X dakika içindeki başarısız denemeleri say
  const windowStart = new Date(now.getTime() - PIN_SECURITY_CONFIG.ATTEMPT_WINDOW_MINUTES * 60 * 1000)
  const recentFailedAttempts = await prisma.pinAttempt.count({
    where: {
      entityType,
      entityId,
      successful: false,
      attemptedAt: {
        gte: windowStart
      }
    }
  })

  return {
    isLocked,
    remainingAttempts: Math.max(0, PIN_SECURITY_CONFIG.MAX_ATTEMPTS - recentFailedAttempts),
    lockStartTime: profile.lockStartTime,
    lockEndTime,
    canAttempt: !isLocked
  }
}

/**
 * Başarısız denemeleri sıfırlar ve bloke açık
 */
export async function resetFailedAttempts(
  entityType: 'teacher' | 'company',
  entityId: string
): Promise<void> {
  await updateEntityProfile(entityType, entityId, {
    isLocked: false,
    lockStartTime: null,
    failedAttempts: 0,
    lastFailedAttempt: null
  })
}

/**
 * Manuel bloke açma (admin tarafından)
 */
export async function unlockEntity(
  entityType: 'teacher' | 'company',
  entityId: string
): Promise<void> {
  await resetFailedAttempts(entityType, entityId)
}

/**
 * Entity profil bilgilerini getirir
 */
async function getEntityProfile(entityType: 'teacher' | 'company', entityId: string) {
  if (entityType === 'teacher') {
    return await prisma.teacherProfile.findUnique({
      where: { id: entityId },
      select: {
        isLocked: true,
        lockStartTime: true,
        failedAttempts: true,
        lastFailedAttempt: true
      }
    })
  } else {
    return await prisma.companyProfile.findUnique({
      where: { id: entityId },
      select: {
        isLocked: true,
        lockStartTime: true,
        failedAttempts: true,
        lastFailedAttempt: true
      }
    })
  }
}

/**
 * Entity profil bilgilerini günceller
 */
async function updateEntityProfile(
  entityType: 'teacher' | 'company',
  entityId: string,
  data: {
    isLocked?: boolean
    lockStartTime?: Date | null
    failedAttempts?: number
    lastFailedAttempt?: Date | null
  }
) {
  if (entityType === 'teacher') {
    return await prisma.teacherProfile.update({
      where: { id: entityId },
      data
    })
  } else {
    return await prisma.companyProfile.update({
      where: { id: entityId },
      data
    })
  }
}

/**
 * PIN attempt geçmişini getirir
 */
export async function getPinAttemptHistory(
  entityType: 'teacher' | 'company',
  entityId: string,
  limit: number = 10
) {
  return await prisma.pinAttempt.findMany({
    where: {
      entityType,
      entityId
    },
    orderBy: {
      attemptedAt: 'desc'
    },
    take: limit,
    select: {
      id: true,
      successful: true,
      attemptedAt: true,
      ipAddress: true
    }
  })
}