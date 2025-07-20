import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            adminProfile: true,
            teacherProfile: true,
            companyProfile: true
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: user.adminProfile || user.teacherProfile || user.companyProfile
        }
      }
    }),
    CredentialsProvider({
      id: 'pin',
      name: 'PIN Authentication',
      credentials: {
        type: { label: 'Type', type: 'text' },
        entityId: { label: 'Entity ID', type: 'text' },
        pin: { label: 'PIN', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.type || !credentials?.entityId || !credentials?.pin) {
          return null
        }

        try {
          if (credentials.type === 'isletme') {
            const company = await prisma.companyProfile.findUnique({
              where: { id: credentials.entityId },
              select: { id: true, name: true, pin: true }
            })

            if (!company || company.pin !== credentials.pin) {
              return null
            }

            return {
              id: company.id,
              email: `company_${company.id}@system.local`,
              name: company.name,
              role: 'COMPANY',
              profile: company
            }
          } else if (credentials.type === 'ogretmen') {
            const teacher = await prisma.teacherProfile.findUnique({
              where: { id: credentials.entityId },
              select: { id: true, name: true, surname: true, pin: true }
            })

            if (!teacher || teacher.pin !== credentials.pin) {
              return null
            }

            return {
              id: teacher.id,
              email: `teacher_${teacher.id}@system.local`,
              name: `${teacher.name} ${teacher.surname}`,
              role: 'TEACHER',
              profile: teacher
            }
          }

          return null
        } catch (error) {
          console.error('PIN authentication error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role
        token.profile = user.profile
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.profile = token.profile
      }
      return session
    }
  },
  pages: {
    signIn: '/admin/login'
  }
}

export default NextAuth(authOptions)