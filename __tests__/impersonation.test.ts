import { belirtecOlustur, belirteciDogrula, GIRIS_SURESI_SN } from '@/lib/impersonation'

describe('yönetici öğretmen oturumu belirteçleri', () => {
  const eskiSecret = process.env.NEXTAUTH_SECRET

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret'
  })

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = eskiSecret
    jest.useRealTimers()
  })

  it('geçerli giriş belirtecini kabul eder', () => {
    const t = belirtecOlustur('giris', 'admin-1', 'mudur@okul.test', 'ogretmen-1')
    const yuk = belirteciDogrula(t, 'giris')
    expect(yuk?.adminId).toBe('admin-1')
    expect(yuk?.teacherId).toBe('ogretmen-1')
  })

  it('giriş belirteci ikinci kez kullanılamaz', () => {
    const t = belirtecOlustur('giris', 'admin-1', 'mudur@okul.test', 'ogretmen-1')
    expect(belirteciDogrula(t, 'giris')).not.toBeNull()
    expect(belirteciDogrula(t, 'giris')).toBeNull()
  })

  it('amaçlar birbirinin yerine kullanılamaz', () => {
    const donus = belirtecOlustur('donus', 'admin-1', 'mudur@okul.test', 'ogretmen-1')
    expect(belirteciDogrula(donus, 'giris')).toBeNull()
    const giris = belirtecOlustur('giris', 'admin-1', 'mudur@okul.test', 'ogretmen-1')
    expect(belirteciDogrula(giris, 'donus')).toBeNull()
  })

  it('değiştirilmiş içerik veya imza reddedilir', () => {
    const t = belirtecOlustur('giris', 'admin-1', 'mudur@okul.test', 'ogretmen-1')
    const [veri, imza] = t.split('.')
    const yuk = JSON.parse(Buffer.from(veri, 'base64url').toString('utf8'))
    yuk.teacherId = 'baska-ogretmen'
    const sahteVeri = Buffer.from(JSON.stringify(yuk)).toString('base64url')
    expect(belirteciDogrula(`${sahteVeri}.${imza}`, 'giris')).toBeNull()
    expect(belirteciDogrula(`${veri}.${imza.slice(0, -2)}xx`, 'giris')).toBeNull()
    expect(belirteciDogrula('rastgele', 'giris')).toBeNull()
    expect(belirteciDogrula(undefined, 'giris')).toBeNull()
  })

  it('başka anahtarla imzalanan belirteç reddedilir', () => {
    const t = belirtecOlustur('donus', 'admin-1', 'mudur@okul.test', 'ogretmen-1')
    process.env.NEXTAUTH_SECRET = 'baska-secret'
    expect(belirteciDogrula(t, 'donus')).toBeNull()
    process.env.NEXTAUTH_SECRET = 'test-secret'
  })

  it('süresi dolan giriş belirteci reddedilir', () => {
    jest.useFakeTimers()
    const t = belirtecOlustur('giris', 'admin-1', 'mudur@okul.test', 'ogretmen-1')
    jest.setSystemTime(Date.now() + (GIRIS_SURESI_SN + 5) * 1000)
    expect(belirteciDogrula(t, 'giris')).toBeNull()
    jest.useRealTimers()
  })
})
