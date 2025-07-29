'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, Key, Building2, Save, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import SuccessModal from '@/components/ui/SuccessModal'

interface Alan {
  id: string
  ad: string
}

interface YeniOgretmenModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function YeniOgretmenModal({ isOpen, onClose, onSuccess }: YeniOgretmenModalProps) {
  const [loading, setLoading] = useState(false)
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    tcNo: '',
    phone: '',
    email: '',
    pin: '1234',
    alanId: '',
    position: ''
  })

  // Fetch alanlar for the dropdown
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        surname: '',
        tcNo: '',
        phone: '',
        email: '',
        pin: '1234',
        alanId: '',
        position: ''
      })
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // TC No için sadece rakam
    if (name === 'tcNo') {
      const numericValue = value.replace(/\D/g, '')
      if (numericValue.length <= 11) {
        setFormData(prev => ({ ...prev, [name]: numericValue }))
      }
      return
    }
    
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
          tcNo: formData.tcNo.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          pin: formData.pin.trim(),
          alanId: formData.alanId || null,
          position: formData.position || null
        }),
      })

      if (response.ok) {
        const newTeacher = await response.json()
        setShowSuccessModal(true)
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

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
    onSuccess()
    onClose()
  }

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Öğretmen Ekle"
      titleIcon={User}
    >
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
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
                autoComplete="off"
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
                autoComplete="off"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Soyisim"
              />
            </div>
          </div>
        </div>

        {/* TC No */}
        <div>
          <label htmlFor="tcNo" className="block text-sm font-medium text-gray-700 mb-2">
            TC Kimlik No
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="tcNo"
              name="tcNo"
              value={formData.tcNo}
              onChange={handleInputChange}
              autoComplete="off"
              maxLength={11}
              inputMode="numeric"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="12345678901"
            />
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
                autoComplete="off"
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
                autoComplete="off"
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

        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Görev
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="position"
                value="alan_sefi"
                checked={formData.position === 'alan_sefi'}
                onChange={handleInputChange}
                className="mr-3 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Alan Şefi</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="position"
                value="atolye_sefi"
                checked={formData.position === 'atolye_sefi'}
                onChange={handleInputChange}
                className="mr-3 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Atölye Şefi</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="position"
                value=""
                checked={formData.position === ''}
                onChange={handleInputChange}
                className="mr-3 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Öğretmen (Görev Yok)</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 text-red-600 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            title="İptal"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center w-10 h-10 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Öğretmen Ekle"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Required Fields Note */}
        <div className="text-sm text-gray-600">
          <p>* işaretli alanlar zorunludur.</p>
        </div>
      </form>
    </Modal>

    <SuccessModal
      isOpen={showSuccessModal}
      onClose={handleSuccessModalClose}
      title="Başarılı!"
      message={`${formData.name} ${formData.surname} başarıyla eklendi.`}
      countdown={3}
    />
    </>
  )
}