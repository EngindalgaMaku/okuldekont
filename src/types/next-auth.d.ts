import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      profile?: any
      companyId?: string
      teacherId?: string
      impersonatedBy?: string
    }
  }

  interface User {
    id: string
    email: string
    role: string
    profile?: any
    companyId?: string
    teacherId?: string
    impersonatedBy?: string
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