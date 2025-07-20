'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, User, Mail, Phone, Key, Building2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Alan {
  id: string
  ad: string
}

export default function YeniOgretmenPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    email: '',
    pin: '1234',
    alanId: ''
  })

  // Fetch alanlar for the dropdown
  useEffect(() => {
    const fetchAlanlar = async () => {
      try {
        const response = await fetch('/api/admin/fields')
        if (response.ok) {
          const data = await response.json()
          setAlanlar(data)
        }
      } catch (error) {
        console.error('Error fetching alanlar:', error)
      }
    }
    fetchAlanlar()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          alanId: formData.alanId || null
        }),
      })

      if (response.ok) {
        const newTeacher = await response.json()
        toast.success('Öğretmen başarıyla eklendi')
        router.push('/admin/ogretmenler')
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/ogretmenler" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Öğretmenler
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-500" />
            Yeni Öğretmen Ekle
          </h1>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            {/* Name and Surname */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  İsim *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="İsim"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-2">
                  Soyisim *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="surname"
                    name="surname"
                    value={formData.surname}
                    onChange={handleInputChange}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Soyisim"
                  />
                </div>
              </div>
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    autoComplete="new-password"
                    data-form-type="other"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="05xx xxx xx xx"
                  />
                </div>
              </div>
            </div>

            {/* PIN and Alan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                  PIN (4 haneli) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="pin"
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
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1234"
                  />
                </div>
                <p className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
                  <span className="font-medium">⚠️ Not:</span> Varsayılan PIN (1234) seçilirse, öğretmen ilk girişte PIN'ini değiştirmek zorunda bırakılır.
                </p>
              </div>

              <div>
                <label htmlFor="alanId" className="block text-sm font-medium text-gray-700 mb-2">
                  Alan
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="alanId"
                    name="alanId"
                    value={formData.alanId}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Alan seçin...</option>
                    {alanlar.map((alan) => (
                      <option key={alan.id} value={alan.id}>
                        {alan.ad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4 pt-6">
              <Link
                href="/admin/ogretmenler"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                İptal
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Ekleniyor...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Öğretmen Ekle
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Required Fields Note */}
        <div className="mt-4 text-sm text-gray-600">
          <p>* işaretli alanlar zorunludur.</p>
        </div>
      </div>
    </div>
  )
}