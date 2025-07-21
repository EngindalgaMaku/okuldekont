'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, User, Building2, Save, Loader } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Modal from './Modal'

interface Teacher {
  id: string
  name: string
  surname: string
  alan?: {
    name: string
  }
}

interface Company {
  id: string
  name: string
}

interface GorevBelgesiModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function GorevBelgesiModal({ isOpen, onClose }: GorevBelgesiModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  
  const [formData, setFormData] = useState({
    teacherId: '',
    hafta: '',
    isletmeIdler: [] as string[]
  })

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [teachersResponse, companiesResponse] = await Promise.all([
        fetch('/api/admin/teachers'),
        fetch('/api/admin/companies')
      ])
      
      if (teachersResponse.ok) {
        const teachersData = await teachersResponse.json()
        setTeachers(teachersData || [])
      }
      
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json()
        setCompanies(companiesData || [])
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.teacherId || !formData.hafta || formData.isletmeIdler.length === 0) {
      toast.error('Lütfen tüm alanları doldurun')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/admin/gorev-belgeleri', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ogretmenId: formData.teacherId,
          hafta: formData.hafta,
          isletmeIdler: JSON.stringify(formData.isletmeIdler)
        })
      })

      if (!response.ok) {
        throw new Error('Görev belgesi oluşturulamadı')
      }

      toast.success('Görev belgesi başarıyla oluşturuldu')
      handleClose()
    } catch (error) {
      console.error('Görev belgesi oluştururken hata:', error)
      toast.error('Görev belgesi oluşturulurken hata oluştu')
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    setFormData({
      teacherId: '',
      hafta: '',
      isletmeIdler: []
    })
    onClose()
  }

  const handleCompanyToggle = (companyId: string) => {
    setFormData(prev => ({
      ...prev,
      isletmeIdler: prev.isletmeIdler.includes(companyId)
        ? prev.isletmeIdler.filter(id => id !== companyId)
        : [...prev.isletmeIdler, companyId]
    }))
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Görev Belgesi Oluştur">
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin h-8 w-8 text-indigo-600" />
          <span className="ml-2">Veriler yükleniyor...</span>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yeni Görev Belgesi Oluştur">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Öğretmen Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="inline h-4 w-4 mr-1" />
            Öğretmen Seç
          </label>
          <select
            value={formData.teacherId}
            onChange={(e) => setFormData(prev => ({ ...prev, teacherId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">Öğretmen seçiniz...</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} {teacher.surname}
                {teacher.alan ? ` (${teacher.alan.name})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Hafta Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline h-4 w-4 mr-1" />
            Hafta
          </label>
          <input
            type="week"
            value={formData.hafta}
            onChange={(e) => setFormData(prev => ({ ...prev, hafta: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        {/* İşletme Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building2 className="inline h-4 w-4 mr-1" />
            İşletmeler ({formData.isletmeIdler.length} seçili)
          </label>
          <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
            {companies.length > 0 ? (
              <div className="space-y-2">
                {companies.map((company) => (
                  <label key={company.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isletmeIdler.includes(company.id)}
                      onChange={() => handleCompanyToggle(company.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{company.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Henüz işletme bulunmuyor</p>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={creating}
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
          >
            {creating ? (
              <>
                <Loader className="animate-spin h-4 w-4 mr-2" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Oluştur
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}