'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  Calendar,
  Search,
  Filter,
  FileText,
  Users,
  Building,
  GraduationCap,
  AlertCircle,
  Package,
  CheckCircle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface Alan {
  id: string
  name: string
}

interface Ogretmen {
  id: string
  name: string
  surname: string
  fullName: string
}

interface DownloadOptions {
  ay: string
  yil: string
  alan: string
  ogretmen: string
}

const aylar = [
  { value: '1', label: 'Ocak' },
  { value: '2', label: 'Şubat' },
  { value: '3', label: 'Mart' },
  { value: '4', label: 'Nisan' },
  { value: '5', label: 'Mayıs' },
  { value: '6', label: 'Haziran' },
  { value: '7', label: 'Temmuz' },
  { value: '8', label: 'Ağustos' },
  { value: '9', label: 'Eylül' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasım' },
  { value: '12', label: 'Aralık' }
]

export default function TopluBelgeIndirmePage() {
  const router = useRouter()
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [ogretmenler, setOgretmenler] = useState<Ogretmen[]>([])
  const [loading, setLoading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(false)
  const [message, setMessage] = useState('')
  const [currentYear] = useState(new Date().getFullYear())
  
  const [options, setOptions] = useState<DownloadOptions>({
    ay: new Date().getMonth().toString(), // Önceki ay
    yil: currentYear.toString(),
    alan: '',
    ogretmen: ''
  })

  // Fetch alanlar
  const fetchAlanlar = async () => {
    try {
      const response = await fetch('/api/admin/araclar/alanlar')
      if (response.ok) {
        const result = await response.json()
        setAlanlar(result.data || [])
      }
    } catch (error) {
      console.error('Alan listesi getirme hatası:', error)
    }
  }

  // Fetch ogretmenler by alan
  const fetchOgretmenler = async (alanId: string) => {
    if (!alanId) {
      setOgretmenler([])
      return
    }

    try {
      const response = await fetch(`/api/admin/araclar/alanlar/${alanId}/ogretmenler`)
      if (response.ok) {
        const result = await response.json()
        setOgretmenler(result.data || [])
      } else {
        setOgretmenler([])
      }
    } catch (error) {
      console.error('Öğretmen listesi getirme hatası:', error)
      setOgretmenler([])
    }
  }

  useEffect(() => {
    fetchAlanlar()
  }, [])

  // Alan seçimi değişince öğretmenleri getir
  useEffect(() => {
    if (options.alan) {
      fetchOgretmenler(options.alan)
      setOptions(prev => ({ ...prev, ogretmen: '' }))
    } else {
      setOgretmenler([])
    }
  }, [options.alan])

  const handleDownload = async () => {
    if (!options.alan || !options.ogretmen) {
      setMessage('Alan ve öğretmen seçimi zorunludur!')
      return
    }

    setDownloadProgress(true)
    setMessage('')

    try {
      const params = new URLSearchParams({
        ay: options.ay,
        yil: options.yil,
        alan: options.alan,
        ogretmen: options.ogretmen
      })

      const response = await fetch(`/api/admin/araclar/toplu-belge-indirme?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'İndirme hatası')
      }

      // ZIP dosyasını indir
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const selectedMonth = aylar.find(a => a.value === options.ay)?.label || 'Bilinmeyen'
      const selectedTeacher = ogretmenler.find(o => o.fullName === options.ogretmen)
      const fileName = `${selectedTeacher?.name}_${selectedTeacher?.surname}_${selectedMonth}_${options.yil}_Dekontlar.zip`
      
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setMessage('Dosyalar başarıyla indirildi!')
      setTimeout(() => setMessage(''), 3000)

    } catch (error) {
      console.error('İndirme hatası:', error)
      setMessage(error instanceof Error ? error.message : 'İndirme sırasında hata oluştu')
    } finally {
      setDownloadProgress(false)
    }
  }

  const handleOptionChange = (key: keyof DownloadOptions, value: string) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/araclar"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Araçlara Dön</span>
            </Link>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Toplu Belge İndirme</h1>
                <p className="text-gray-600 text-sm">Öğretmen dekontlarını aylara göre ZIP olarak indirin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kullanım Uyarısı */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-orange-900 mb-1">Toplu İndirme Kullanımı</h4>
            <p className="text-orange-800 text-sm">
              Seçilen öğretmenin <strong>aylık dekontları</strong> ZIP dosyası olarak indirilir. 
              Her ay için ayrı klasör oluşturulur ve dekontlar <strong>PDF formatında</strong> sıkıştırılır.
              <strong>Alan ve öğretmen seçimi zorunludur.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Seçenekler */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">İndirme Seçenekleri</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ay
            </label>
            <select
              value={options.ay}
              onChange={(e) => handleOptionChange('ay', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {aylar.map(ay => (
                <option key={ay.value} value={ay.value}>
                  {ay.label} {options.yil}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alan <span className="text-red-500">*</span>
            </label>
            <select
              value={options.alan}
              onChange={(e) => handleOptionChange('alan', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                !options.alan
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              required
            >
              <option value="">Alan seçiniz...</option>
              {alanlar.map(alan => (
                <option key={alan.id} value={alan.id}>
                  {alan.name}
                </option>
              ))}
            </select>
            {!options.alan && (
              <p className="text-red-500 text-xs mt-1">
                Alan seçimi zorunludur
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Öğretmen <span className="text-red-500">*</span>
            </label>
            <select
              value={options.ogretmen}
              onChange={(e) => handleOptionChange('ogretmen', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                !options.ogretmen || !options.ogretmen.trim()
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              required
              disabled={!options.alan || ogretmenler.length === 0}
            >
              <option value="">Öğretmen seçiniz...</option>
              {ogretmenler.map(ogretmen => (
                <option key={ogretmen.id} value={ogretmen.fullName}>
                  {ogretmen.fullName}
                </option>
              ))}
            </select>
            {(!options.ogretmen || !options.ogretmen.trim()) && (
              <p className="text-red-500 text-xs mt-1">
                Öğretmen seçimi zorunludur
              </p>
            )}
            {options.alan && ogretmenler.length === 0 && (
              <p className="text-yellow-600 text-xs mt-1">
                Bu alanda öğretmen bulunamadı
              </p>
            )}
          </div>

          <div className="flex items-end">
            <button
              onClick={handleDownload}
              disabled={!options.alan || !options.ogretmen || downloadProgress}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {downloadProgress ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  İndiriliyor...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  ZIP İndir
                </>
              )}
            </button>
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${
            message.includes('başarıyla')
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.includes('başarıyla') ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {message}
            </div>
          </div>
        )}
      </div>

      {/* Bilgi */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">ZIP İçeriği</h4>
            <p className="text-blue-800 text-sm">
              ZIP dosyası içinde her ay için ayrı klasör oluşturulur. Her klasörde o aya ait 
              dekont PDF dosyaları bulunur. Dosya isimleri: <strong>OgrenciAdi_Ayı_Yıl.pdf</strong> formatındadır.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}