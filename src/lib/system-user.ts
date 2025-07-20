import { prisma } from '@/lib/prisma';

let systemUserId: string | null = null;

export async function getSystemUserId(): Promise<string> {
  if (systemUserId) {
    return systemUserId;
  }
  
  try {
    const systemUser = await prisma.user.findUnique({
      where: { email: 'system@okul-dekont.local' }
    });
    
    if (systemUser) {
      systemUserId = systemUser.id;
      return systemUser.id;
    }
    
    // If system user doesn't exist, create it
    const newSystemUser = await prisma.user.create({
      data: {
        email: 'system@okul-dekont.local',
        password: 'dummy-password-not-used',
        role: 'ADMIN'
      }
    });
    
    // Create admin profile
    await prisma.adminProfile.create({
      data: {
        name: 'System Admin',
        userId: newSystemUser.id,
        role: 'ADMIN'
      }
    });
    
    systemUserId = newSystemUser.id;
    return newSystemUser.id;
    
  } catch (error) {
    console.error('Error getting system user ID:', error);
    // Return the known system user ID as fallback
    return 'cmdc15gza0000qv0o5kl7o2s9';
  }
}