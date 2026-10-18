import { canAccessApi } from '@/lib/api-access'

const admin = { role: 'ADMIN' }
const teacher = { role: 'TEACHER', teacherId: 't1' }
const company = { role: 'COMPANY', companyId: 'c1' }

describe('canAccessApi', () => {
  it('admin her admin API’sine erişebilir', () => {
    expect(canAccessApi(admin, '/api/admin/backup', 'POST')).toBe(true)
    expect(canAccessApi(admin, '/api/admin/companies/all', 'GET')).toBe(true)
  })

  describe('öğretmen', () => {
    it('kendi panel uç noktalarına erişebilir', () => {
      expect(canAccessApi(teacher, '/api/admin/teachers/t1', 'GET')).toBe(true)
      expect(canAccessApi(teacher, '/api/admin/teachers/t1/dekontlar', 'GET')).toBe(true)
      expect(canAccessApi(teacher, '/api/admin/teachers/t1/internships', 'GET')).toBe(true)
      expect(canAccessApi(teacher, '/api/admin/teachers/t1/notifications', 'PUT')).toBe(true)
      expect(canAccessApi(teacher, '/api/admin/teachers/t1/pin', 'PUT')).toBe(true)
      expect(canAccessApi(teacher, '/api/admin/dekontlar', 'POST')).toBe(true)
      expect(canAccessApi(teacher, '/api/admin/dekontlar/d1', 'DELETE')).toBe(true)
      expect(canAccessApi(teacher, '/api/admin/dekontlar/preview/a.pdf', 'GET')).toBe(true)
      expect(canAccessApi(teacher, '/api/admin/internships/find', 'GET')).toBe(true)
      expect(canAccessApi(teacher, '/api/admin/payments/student-payment', 'GET')).toBe(true)
    })

    it('başka öğretmenin verisine ve PIN’ine erişemez', () => {
      expect(canAccessApi(teacher, '/api/admin/teachers/t2', 'GET')).toBe(false)
      expect(canAccessApi(teacher, '/api/admin/teachers/t2/pin', 'PUT')).toBe(false)
      expect(canAccessApi(teacher, '/api/admin/teachers/t2/dekontlar', 'GET')).toBe(false)
    })

    it('yönetici işlemlerini yapamaz', () => {
      expect(canAccessApi(teacher, '/api/admin/backup', 'POST')).toBe(false)
      expect(canAccessApi(teacher, '/api/admin/companies/all', 'GET')).toBe(false)
      expect(canAccessApi(teacher, '/api/admin/companies/c1/pin', 'PUT')).toBe(false)
      expect(canAccessApi(teacher, '/api/admin/system-settings', 'POST')).toBe(false)
      expect(canAccessApi(teacher, '/api/admin/dekontlar', 'GET')).toBe(false)
      expect(canAccessApi(teacher, '/api/admin/teachers/t1', 'PUT')).toBe(false)
      expect(canAccessApi(teacher, '/api/companies/c1', 'GET')).toBe(false)
    })
  })

  describe('işletme', () => {
    it('kendi panel uç noktalarına erişebilir', () => {
      expect(canAccessApi(company, '/api/admin/companies/c1', 'GET')).toBe(true)
      expect(canAccessApi(company, '/api/admin/companies/c1/students', 'GET')).toBe(true)
      expect(canAccessApi(company, '/api/admin/dekontlar', 'POST')).toBe(true)
      expect(canAccessApi(company, '/api/companies/c1', 'PUT')).toBe(true)
      expect(canAccessApi(company, '/api/companies/c1/dekontlar', 'GET')).toBe(true)
    })

    it('başka işletmeye ve yönetici işlemlerine erişemez', () => {
      expect(canAccessApi(company, '/api/companies/c2', 'GET')).toBe(false)
      expect(canAccessApi(company, '/api/companies/c2/students', 'GET')).toBe(false)
      expect(canAccessApi(company, '/api/admin/companies/c2', 'GET')).toBe(false)
      expect(canAccessApi(company, '/api/admin/companies/all', 'GET')).toBe(false)
      expect(canAccessApi(company, '/api/admin/teachers/t1', 'GET')).toBe(false)
      expect(canAccessApi(company, '/api/admin/backup', 'POST')).toBe(false)
    })
  })

  it('rolü olmayan token hiçbir yere erişemez', () => {
    expect(canAccessApi({}, '/api/admin/system-settings', 'GET')).toBe(false)
  })
})
