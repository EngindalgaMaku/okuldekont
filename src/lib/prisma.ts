import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'minimal',
  // Optimize datasource for better performance
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// Connection pool optimization through environment variables
// Add these to your .env file:
// DATABASE_CONNECTION_LIMIT=20
// DATABASE_POOL_TIMEOUT=30000
// DATABASE_QUERY_TIMEOUT=10000

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma