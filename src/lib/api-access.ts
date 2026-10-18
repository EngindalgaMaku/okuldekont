// Middleware'de token'dan kullanılan alanlar
interface AccessToken {
  role?: unknown
  teacherId?: unknown
  companyId?: unknown
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

// Öğretmen/işletme panellerinin kullandığı admin API'leri.
// own: yoldaki ilk yakalanan grup, giriş yapan kullanıcının kendi ID'si olmalı.
interface Rule {
  pattern: RegExp
  methods: Method[]
  own?: boolean
}

const TEACHER_RULES: Rule[] = [
  { pattern: /^\/api\/admin\/teachers\/([^/]+)$/, methods: ['GET'], own: true },
  { pattern: /^\/api\/admin\/teachers\/([^/]+)\/(dekontlar|historical-dekontlar|belgeler|internships)$/, methods: ['GET'], own: true },
  { pattern: /^\/api\/admin\/teachers\/([^/]+)\/notifications$/, methods: ['GET', 'PUT', 'POST'], own: true },
  { pattern: /^\/api\/admin\/teachers\/([^/]+)\/pin$/, methods: ['PUT'], own: true },
  { pattern: /^\/api\/admin\/system-settings$/, methods: ['GET'] },
  { pattern: /^\/api\/admin\/companies\/types$/, methods: ['GET'] },
  { pattern: /^\/api\/admin\/internships\/find$/, methods: ['GET'] },
  { pattern: /^\/api\/admin\/payments\/student-payment$/, methods: ['GET'] },
  { pattern: /^\/api\/admin\/dekontlar$/, methods: ['POST'] },
  { pattern: /^\/api\/admin\/dekontlar\/[^/]+$/, methods: ['DELETE'] },
  { pattern: /^\/api\/admin\/dekontlar\/(download|preview)\/[^/]+$/, methods: ['GET'] },
  { pattern: /^\/api\/admin\/belgeler$/, methods: ['POST'] },
  { pattern: /^\/api\/admin\/belgeler\/[^/]+$/, methods: ['DELETE'] },
]

const COMPANY_RULES: Rule[] = [
  { pattern: /^\/api\/admin\/companies\/([^/]+)$/, methods: ['GET'], own: true },
  { pattern: /^\/api\/admin\/companies\/([^/]+)\/students$/, methods: ['GET'], own: true },
  { pattern: /^\/api\/admin\/system-settings$/, methods: ['GET'] },
  { pattern: /^\/api\/admin\/dekontlar$/, methods: ['POST'] },
  { pattern: /^\/api\/admin\/belgeler\/download\/[^/]+$/, methods: ['GET'] },
  // İşletmenin kendi kaydı ve alt kaynakları (PIN değişikliği dahil)
  { pattern: /^\/api\/companies\/([^/]+)(\/.*)?$/, methods: ['GET', 'POST', 'PUT', 'DELETE'], own: true },
]

function isAllowed(rules: Rule[], pathname: string, method: string, ownId?: string) {
  return rules.some((rule) => {
    const match = rule.pattern.exec(pathname)
    if (!match || !rule.methods.includes(method as Method)) return false
    return !rule.own || (!!ownId && decodeURIComponent(match[1]) === ownId)
  })
}

export function canAccessApi(token: AccessToken, pathname: string, method: string) {
  if (token.role === 'ADMIN') return true
  if (token.role === 'TEACHER') {
    return isAllowed(TEACHER_RULES, pathname, method, token.teacherId as string | undefined)
  }
  if (token.role === 'COMPANY') {
    return isAllowed(COMPANY_RULES, pathname, method, token.companyId as string | undefined)
  }
  return false
}
