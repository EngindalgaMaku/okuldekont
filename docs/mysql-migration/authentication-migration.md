# Authentication System Migration Plan

## Mevcut Durum (Supabase Auth)

### Supabase Auth Yapısı
```javascript
// Current Supabase Auth
const supabase = createClient(url, anonKey)
const { data: { user } } = await supabase.auth.getUser()

// RLS Policies
auth.uid() = user.id
auth.role() = 'authenticated'
```

### Mevcut Sorunlar
- RLS politikaları çok karmaşık
- Authentication state management zorluluğu
- Session management belirsizlikleri
- Middleware auth checks karmaşık

## Hedef Durum (NextAuth.js)

### NextAuth.js Yapısı
```javascript
// NextAuth.js Configuration
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Custom auth logic
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (user && verifyPassword(credentials.password, user.password)) {
          return {
            id: user.id,
            email: user.email,
            role: user.role
          }
        }
        return null
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.sub
      session.user.role = token.role
      return session
    }
  }
}
```

## Migration Adımları

### 1. NextAuth.js Setup (1 gün)

#### Package Installation
```bash
npm install next-auth @auth/prisma-adapter
npm install bcryptjs @types/bcryptjs
```

#### Environment Variables
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
DATABASE_URL=mysql://user:password@localhost:3306/okul_dekont
```

#### NextAuth Configuration
```javascript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

export default NextAuth(authOptions)
```

### 2. User Model Migration (1 gün)

#### Prisma Schema Updates
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // NextAuth.js required fields
  accounts      Account[]
  sessions      Session[]
  
  // Relations
  adminProfile    AdminProfile?
  teacherProfile  TeacherProfile?
  companyProfile  CompanyProfile?
  
  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}
```

### 3. Middleware Migration (1 gün)

#### New Middleware
```javascript
// middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl
    
    // Admin routes
    if (pathname.startsWith('/admin')) {
      if (!token || token.role !== 'ADMIN') {
        return Response.redirect(new URL('/auth/login', req.url))
      }
    }
    
    // Teacher routes
    if (pathname.startsWith('/ogretmen')) {
      if (!token || token.role !== 'TEACHER') {
        return Response.redirect(new URL('/auth/login', req.url))
      }
    }
    
    // Company routes
    if (pathname.startsWith('/isletme')) {
      if (!token || token.role !== 'COMPANY') {
        return Response.redirect(new URL('/auth/login', req.url))
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/ogretmen/:path*', '/isletme/:path*']
}
```

### 4. API Routes Migration (2 gün)

#### Protected API Routes
```javascript
// lib/auth-helpers.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function requireAuth(req, res, allowedRoles = []) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(session.user.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  return session
}

// API route example
export default async function handler(req, res) {
  const session = await requireAuth(req, res, ['ADMIN', 'TEACHER'])
  if (!session) return
  
  // Your API logic here
}
```

### 5. Client-Side Auth Migration (2 gün)

#### Session Provider Setup
```javascript
// pages/_app.tsx
import { SessionProvider } from 'next-auth/react'

export default function App({
  Component,
  pageProps: { session, ...pageProps }
}) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  )
}
```

#### Client-Side Auth Hooks
```javascript
// hooks/useAuth.ts
import { useSession } from 'next-auth/react'

export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    role: session?.user?.role
  }
}

// Component example
function AdminComponent() {
  const { user, isAuthenticated, role } = useAuth()
  
  if (!isAuthenticated || role !== 'ADMIN') {
    return <div>Access Denied</div>
  }
  
  return <div>Admin Content</div>
}
```

### 6. Login/Logout Implementation (1 gün)

#### Login Page
```javascript
// pages/auth/login.tsx
import { signIn, getSession } from 'next-auth/react'
import { useState } from 'react'

export default function Login() {
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await signIn('credentials', {
      email: credentials.email,
      password: credentials.password,
      redirect: false
    })
    
    if (result?.error) {
      alert('Login failed')
    } else {
      window.location.href = '/dashboard'
    }
    
    setLoading(false)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={credentials.email}
        onChange={(e) => setCredentials({...credentials, email: e.target.value})}
        placeholder="Email"
      />
      <input 
        type="password" 
        value={credentials.password}
        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
        placeholder="Password"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
```

#### Logout Implementation
```javascript
import { signOut } from 'next-auth/react'

function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/auth/login' })}>
      Logout
    </button>
  )
}
```

### 7. Data Migration (1 gün)

#### User Data Migration Script
```javascript
// scripts/migrate-users.js
const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function migrateUsers() {
  // Get admin users
  const { data: admins } = await supabase
    .from('admin_kullanicilar')
    .select('*')
    
  // Get teachers
  const { data: teachers } = await supabase
    .from('ogretmenler')
    .select('*')
    
  // Get companies
  const { data: companies } = await supabase
    .from('isletmeler')
    .select('*')
  
  // Migrate admins
  for (const admin of admins) {
    const hashedPassword = await bcrypt.hash(admin.password || 'default123', 10)
    
    await prisma.user.create({
      data: {
        email: admin.email,
        password: hashedPassword,
        role: 'ADMIN',
        adminProfile: {
          create: {
            name: admin.name || 'Admin'
          }
        }
      }
    })
  }
  
  // Migrate teachers
  for (const teacher of teachers) {
    const hashedPassword = await bcrypt.hash(teacher.pin || '1234', 10)
    
    await prisma.user.create({
      data: {
        email: teacher.email || `teacher-${teacher.id}@school.com`,
        password: hashedPassword,
        role: 'TEACHER',
        teacherProfile: {
          create: {
            name: teacher.ad,
            surname: teacher.soyad,
            phone: teacher.telefon,
            email: teacher.email,
            pin: teacher.pin,
            alanId: teacher.alan_id
          }
        }
      }
    })
  }
  
  // Migrate companies
  for (const company of companies) {
    const hashedPassword = await bcrypt.hash(company.pin || '1234', 10)
    
    await prisma.user.create({
      data: {
        email: company.email || `company-${company.id}@company.com`,
        password: hashedPassword,
        role: 'COMPANY',
        companyProfile: {
          create: {
            name: company.ad,
            contact: company.yetkili_kisi,
            phone: company.telefon,
            email: company.email,
            address: company.adres,
            taxNumber: company.vergi_no,
            pin: company.pin
          }
        }
      }
    })
  }
  
  console.log('User migration completed!')
}

migrateUsers().catch(console.error)
```

## Testing Strategy

### 1. Unit Tests
```javascript
// __tests__/auth.test.js
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

describe('Authentication', () => {
  it('should authenticate valid user', async () => {
    // Test login functionality
  })
  
  it('should reject invalid credentials', async () => {
    // Test failed login
  })
  
  it('should handle role-based access', async () => {
    // Test role permissions
  })
})
```

### 2. Integration Tests
- Login/logout flow
- Protected routes
- Role-based access control
- Session persistence

## Security Considerations

### 1. Password Security
- bcrypt hashing
- Password complexity requirements
- Rate limiting on login attempts

### 2. JWT Security
- Secure secret key
- Token expiration
- Refresh token rotation

### 3. CSRF Protection
- Built-in NextAuth.js CSRF protection
- Secure cookie settings

## Performance Optimization

### 1. Session Caching
- JWT tokens (stateless)
- Session storage optimization

### 2. Database Queries
- Optimized user lookups
- Proper indexing

## Migration Timeline

### Day 1-2: Setup & Configuration
- NextAuth.js installation
- Basic configuration
- Environment setup

### Day 3-4: User Model & Migration
- Database schema updates
- User data migration
- Testing

### Day 5-6: Middleware & API Updates
- Protected routes
- Role-based access
- API authentication

### Day 7-8: Client-Side Integration
- Session provider setup
- Login/logout pages
- Auth hooks

### Day 9-10: Testing & Refinement
- Comprehensive testing
- Bug fixes
- Performance optimization

## Rollback Strategy

### 1. Database Backup
- Full backup before migration
- Incremental backups during process

### 2. Feature Flags
- Gradual rollout capability
- Quick rollback switches

### 3. Monitoring
- Auth failure monitoring
- Performance metrics
- User feedback tracking

Bu migration planı ile güvenli, performanslı ve maintainable bir authentication sistemi elde edeceksiniz.