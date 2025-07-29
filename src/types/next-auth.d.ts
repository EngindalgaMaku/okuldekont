import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      role: string
      profile?: any
      companyId?: string
      teacherId?: string
    }
  }

  interface User {
    id: string
    email: string
    role: string
    profile?: any
    companyId?: string
    teacherId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    role: string
    profile?: any
  }
}