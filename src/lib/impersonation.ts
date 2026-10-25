import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// Yöneticinin bir öğretmen hesabına geçmesi için kısa ömürlü, imzalı belirteçler.
// "giris": öğretmen oturumunu açar (60 sn, tek kullanımlık)
// "donus": aynı yöneticinin kendi hesabına dönmesini sağlar (oturum süresi kadar)

type Amac = 'giris' | 'donus'

interface Yuk {
  amac: Amac
  adminId: string
  adminEmail: string
  teacherId: string
  exp: number
  nonce: string
}

export const GIRIS_SURESI_SN = 60
export const DONUS_SURESI_SN = 8 * 60 * 60

// Aynı giriş belirteci ikinci kez kullanılamasın
const kullanilanlar = new Map<string, number>()

function gizliAnahtar() {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET tanımlı değil')
  return secret
}

function imzala(veri: string) {
  return createHmac('sha256', gizliAnahtar()).update(`kpanel-impersonation:${veri}`).digest('base64url')
}

export function belirtecOlustur(amac: Amac, adminId: string, adminEmail: string, teacherId: string) {
  const sure = amac === 'giris' ? GIRIS_SURESI_SN : DONUS_SURESI_SN
  const yuk: Yuk = {
    amac,
    adminId,
    adminEmail,
    teacherId,
    exp: Math.floor(Date.now() / 1000) + sure,
    nonce: randomBytes(12).toString('base64url'),
  }
  const veri = Buffer.from(JSON.stringify(yuk)).toString('base64url')
  return `${veri}.${imzala(veri)}`
}

export function belirteciDogrula(belirtec: string | undefined, amac: Amac): Yuk | null {
  if (!belirtec || typeof belirtec !== 'string') return null
  const [veri, imza] = belirtec.split('.')
  if (!veri || !imza) return null

  const beklenen = Buffer.from(imzala(veri))
  const gelen = Buffer.from(imza)
  if (beklenen.length !== gelen.length || !timingSafeEqual(beklenen, gelen)) return null

  let yuk: Yuk
  try {
    yuk = JSON.parse(Buffer.from(veri, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  const simdi = Math.floor(Date.now() / 1000)
  if (yuk.amac !== amac || typeof yuk.exp !== 'number' || yuk.exp < simdi) return null

  if (amac === 'giris') {
    kullanilanlar.forEach((exp, n) => {
      if (exp < simdi) kullanilanlar.delete(n)
    })
    if (kullanilanlar.has(yuk.nonce)) return null
    kullanilanlar.set(yuk.nonce, yuk.exp)
  }
  return yuk
}
