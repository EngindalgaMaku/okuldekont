'use client'

import { useState } from 'react'
import { User, Users, Building2, Mail, Phone, ChevronRight, Plus, Key } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import Modal from '@/components/ui/Modal'

interface Ogretmen {
  id: string;
  ad: string;
  soyad: string;
  email: string | null;
  telefon: string | null;
  ogrenci_sayisi: number;
}

interface Props {
  ogretmenler: Ogretmen[]
  alanId: string
  alanAd: string
}

export default function OgretmenlerTab({ ogretmenler, alanId, alanAd }: Props) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    email: '',
    pin: '1234'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('İsim zorunludur')
      return
    }
    
    if (!formData.surname.trim()) {
      toast.error('Soyisim zorunludur')
      return
    }
    
    if (!formData.pin.trim()) {
      toast.error('PIN zorunludur')
      return
    }
    
    if (formData.pin.length !== 4) {
      toast.error('PIN 4 haneli olmalıdır')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          surname: formData.surname.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          pin: formData.pin.trim(),
          alanId: alanId // Alan ID'si otomatik olarak set ediliyor
        }),
      })

      if (response.ok) {
        const newTeacher = await response.json()
        toast.success('Öğretmen başarıyla eklendi')
        setIsAddModalOpen(false)
        setFormData({ name: '', surname: '', phone: '', email: '', pin: '1234' })
        // Sayfayı yenile
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Öğretmen eklenirken hata oluştu')
      }
    } catch (error) {
      console.error('Error creating teacher:', error)
      toast.error('Öğretmen eklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (ogretmenler.length === 0) {
    return (
      <>
        <div className="text-center py-8 sm:py-12">
          <div className="text-gray-400 text-4xl sm:text-5xl mb-3 sm:mb-4">👨‍🏫</div>
          <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">Henüz öğretmen yok</h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">Bu alana henüz öğretmen atanmamış.</p>
          <button
            onClick={() => {
              setFormData({ name: '', surname: '', phone: '', email: '', pin: '1234' })
              setIsAddModalOpen(true)
            }}
            className="mt-4 inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" /> Öğretmen Ekle
          </button>
        </div>

        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setFormData({ name: '', surname: '', phone: '', email: '', pin: '1234' })
            setIsAddModalOpen(false)
          }}
          title={`${alanAd} Alanına Öğretmen Ekle`}
        >
          <form
            key={`teacher-form-${isAddModalOpen ? 'open' : 'closed'}`}
            onSubmit={handleSubmit}
            className="space-y-4"
            autoComplete="off"
          >
            {/* Alan Bilgisi */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <Building2 className="h-5 w-5 text-indigo-600 mr-2" />
                <span className="text-sm font-medium text-indigo-800">Alan: {alanAd}</span>
              </div>
            </div>

            {/* Name and Surname */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">İsim *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="İsim"
                />
              </div>
              <div>
                <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-2">Soyisim *</label>
                <input
                  type="text"
                  id="surname"
                  name="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Soyisim"
                />
              </div>
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                <input
                  type="email"
                  id="teacher-email-field"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  data-form-type="other"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="ornek@email.com"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="05xx xxx xx xx"
                />
              </div>
            </div>

            {/* PIN */}
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">PIN (4 haneli) *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="teacher-pin-field"
                  name="pin"
                  value={formData.pin}
                  onChange={handleInputChange}
                  required
                  maxLength={4}
                  minLength={4}
                  pattern="[0-9]{4}"
                  inputMode="numeric"
                  autoComplete="off"
                  data-form-type="other"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="1234"
                />
              </div>
              <p className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
                <span className="font-medium">⚠️ Not:</span> Varsayılan PIN (1234) seçilirse, öğretmen ilk girişte PIN'ini değiştirmek zorunda bırakılır.
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Ekleniyor...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Öğretmen Ekle
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      </>
    )
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => {
              setFormData({ name: '', surname: '', phone: '', email: '', pin: '1234' })
              setIsAddModalOpen(true)
            }}
            className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" /> Öğretmen Ekle
          </button>
        </div>
        
        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3">
          {ogretmenler.map((ogretmen) => (
            <div key={ogretmen.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">👨‍🏫</div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/ogretmenler/${ogretmen.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer mb-1 block"
                    >
                      {ogretmen.ad} {ogretmen.soyad}
                    </Link>
                    <div className="space-y-1">
                      {ogretmen.email && (
                        <div className="flex items-center text-xs text-gray-600">
                          <Mail className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="truncate">{ogretmen.email}</span>
                        </div>
                      )}
                      {ogretmen.telefon && (
                        <div className="flex items-center text-xs text-gray-600">
                          <Phone className="h-3 w-3 mr-1 text-gray-400" />
                          {ogretmen.telefon}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/admin/ogretmenler/${ogretmen.id}`}
                  className="inline-flex items-center justify-center w-8 h-8 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-full transition-colors"
                  title="Detaylar"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center text-xs">
                  <span className="text-gray-500 mr-1">Öğrenci:</span>
                  <span className="font-semibold text-gray-800">{ogretmen.ogrenci_sayisi}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öğretmen
                  </th>
                  <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öğrenci Sayısı
                  </th>
                  <th scope="col" className="relative px-3 py-2 sm:px-6 sm:py-3">
                    <span className="sr-only">Detaylar</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ogretmenler.map((ogretmen) => (
                  <tr key={ogretmen.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <div className="flex items-start">
                        <div className="text-xl sm:text-2xl mr-2 sm:mr-3">👨‍🏫</div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/admin/ogretmenler/${ogretmen.id}`}
                            className="text-xs sm:text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer mb-1 block"
                          >
                            {ogretmen.ad} {ogretmen.soyad}
                          </Link>
                          <div className="space-y-1">
                            {ogretmen.email && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Mail className="h-3 w-3 mr-1 text-gray-400" />
                                <span className="truncate">{ogretmen.email}</span>
                              </div>
                            )}
                            {ogretmen.telefon && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                {ogretmen.telefon}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-center">
                      <span className="text-xs sm:text-sm font-semibold text-gray-800">{ogretmen.ogrenci_sayisi}</span>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-center">
                      <Link
                        href={`/admin/ogretmenler/${ogretmen.id}`}
                        className="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-full transition-colors"
                        title="Detaylar"
                      >
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setFormData({ name: '', surname: '', phone: '', email: '', pin: '1234' })
          setIsAddModalOpen(false)
        }}
        title={`${alanAd} Alanına Öğretmen Ekle`}
      >
        <form
          key={`teacher-form-main-${isAddModalOpen ? 'open' : 'closed'}`}
          onSubmit={handleSubmit}
          className="space-y-4"
          autoComplete="off"
        >
          {/* Alan Bilgisi */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-indigo-600 mr-2" />
              <span className="text-sm font-medium text-indigo-800">Alan: {alanAd}</span>
            </div>
          </div>

          {/* Name and Surname */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">İsim *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="İsim"
              />
            </div>
            <div>
              <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-2">Soyisim *</label>
              <input
                type="text"
                id="surname"
                name="surname"
                value={formData.surname}
                onChange={handleInputChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Soyisim"
              />
            </div>
          </div>

          {/* Email and Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
              <input
                type="email"
                id="teacher-email-field-2"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="new-password"
                data-form-type="other"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="ornek@email.com"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="05xx xxx xx xx"
              />
            </div>
          </div>

          {/* PIN */}
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">PIN (4 haneli) *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="teacher-pin-field-2"
                name="pin"
                value={formData.pin}
                onChange={handleInputChange}
                required
                maxLength={4}
                minLength={4}
                pattern="[0-9]{4}"
                inputMode="numeric"
                autoComplete="off"
                data-form-type="other"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="1234"
              />
            </div>
            <p className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
              <span className="font-medium">⚠️ Not:</span> Varsayılan PIN (1234) seçilirse, öğretmen ilk girişte PIN'ini değiştirmek zorunda bırakılır.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Ekleniyor...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Öğretmen Ekle
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}