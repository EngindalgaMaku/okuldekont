require('@testing-library/jest-dom')

// Mock Next.js getServerSession
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock prisma
jest.mock('./src/lib/prisma', () => ({
  dekont: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
}))

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}))

// Mock Tesseract
jest.mock('tesseract.js', () => ({
  recognize: jest.fn(),
  createWorker: jest.fn(),
}))

// Global test setup
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}