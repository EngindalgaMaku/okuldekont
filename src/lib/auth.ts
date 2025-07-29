import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { recordPinAttempt, checkSecurityStatus } from './pin-security'

export const authOptions: NextAuthOptions = {
  debug: false, // Debug tamamen kapatıldı - performans için
  secret: process.env.NEXTAUTH_SECRET,
  
  // SSL/HTTPS configuration for production
  useSecureCookies: process.env.NODE_ENV === 'production',
  
  // Optimized logging - sadece errors ve development'ta diğerleri
  logger: {
    error(code, metadata) {
      console.error('🔥 NextAuth Error:', code, metadata)
    },
    warn(code) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ NextAuth Warning:', code)
      }
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 NextAuth Debug:', code, metadata)
      }
    }
  },
  
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
        pin: { label: 'PIN', type: 'password' },
        ipAddress: { label: 'IP Address', type: 'text' },
        userAgent: { label: 'User Agent', type: 'text' }
      },
      async authorize(credentials) {
        if (process.env.NODE_ENV === 'development') {
          console.log('PIN AUTH: Starting authentication', credentials?.type)
        }
        
        if (!credentials?.type || !credentials?.entityId || !credentials?.pin) {
          return null
        }

        try {
          const entityType = credentials.type === 'isletme' ? 'company' : 'teacher'
          const ipAddress = credentials.ipAddress
          const userAgent = credentials.userAgent

          // Önce güvenlik durumunu kontrol et
          const securityStatus = await checkSecurityStatus(entityType, credentials.entityId)
          
          if (securityStatus.isLocked) {
            return null
          }

          let pinValid = false
          let entityData = null

          if (credentials.type === 'isletme') {
            const company = await prisma.companyProfile.findUnique({
              where: { id: credentials.entityId },
              select: { id: true, name: true, pin: true }
            })

            if (company && company.pin === credentials.pin) {
              pinValid = true
              entityData = {
                id: company.id,
                email: `company_${company.id}@system.local`,
                name: company.name,
                role: 'COMPANY',
                profile: company
              }
            }
          } else if (credentials.type === 'ogretmen') {
            const teacher = await prisma.teacherProfile.findUnique({
              where: { id: credentials.entityId },
              select: { id: true, name: true, surname: true, pin: true }
            })

            if (teacher && teacher.pin === credentials.pin) {
              pinValid = true
              entityData = {
                id: teacher.id,
                email: `teacher_${teacher.id}@system.local`,
                name: `${teacher.name} ${teacher.surname}`,
                role: 'TEACHER',
                profile: teacher
              }
            }
          }

          // PIN denemesini kaydet
          await recordPinAttempt(
            entityType,
            credentials.entityId,
            pinValid,
            ipAddress,
            userAgent
          )

          if (pinValid) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`PIN AUTH: Success for ${entityType} ${credentials.entityId}`)
            }
            return entityData
          } else {
            return null
          }
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
        if (process.env.NODE_ENV === 'development') {
          console.log('JWT CALLBACK: Building token for', user.role)
        }
        
        // user.id'yi token.sub'a ata
        token.sub = user.id
        token.role = user.role
        token.profile = user.profile
        token.email = user.email
        token.name = user.name
        
        // Company kullanıcıları için companyId'yi ekle
        if (user.role === 'COMPANY') {
          token.companyId = user.id
        }
        // Teacher kullanıcıları için teacherId'yi ekle
        if (user.role === 'TEACHER') {
          token.teacherId = user.id
        }
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.profile = token.profile
        // Company ve Teacher ID'lerini session'a aktar
        if (token.companyId) {
          session.user.companyId = token.companyId
        }
        if (token.teacherId) {
          session.user.teacherId = token.teacherId
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/admin/login' // Bu sadece admin için, teacher ve company'de sorun çıkarıyor
  }
}

export default NextAuth(authOptions)