import { prisma } from '@/lib/prisma'

/**
 * Get the currently active education year
 * @returns Active education year or null if none is active
 */
export async function getActiveEducationYear() {
  try {
    const activeYear = await prisma.egitimYili.findFirst({
      where: { active: true }
    })
    
    return activeYear
  } catch (error) {
    console.error('Error fetching active education year:', error)
    return null
  }
}

/**
 * Get the active education year ID
 * @returns Active education year ID or throws error if none is active
 */
export async function getActiveEducationYearId(): Promise<string> {
  const activeYear = await getActiveEducationYear()
  
  if (!activeYear) {
    throw new Error('Aktif eğitim dönemi bulunamadı. Lütfen sistem ayarlarından bir dönem aktif yapın.')
  }
  
  return activeYear.id
}

/**
 * Ensure there's an active education year, throw error if not
 */
export async function requireActiveEducationYear() {
  const activeYear = await getActiveEducationYear()
  
  if (!activeYear) {
    throw new Error('Bu işlem için aktif bir eğitim dönemi gereklidir. Lütfen sistem ayarlarından bir dönem aktif yapın.')
  }
  
  return activeYear
}