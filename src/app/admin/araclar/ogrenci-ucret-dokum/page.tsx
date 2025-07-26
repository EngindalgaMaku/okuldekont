'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Printer,
  Download,
  Calendar,
  Search,
  Filter,
  FileText,
  Users,
  Building,
  GraduationCap,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface DekontData {
  id: string
  isletme_ad: string
  koordinator_ogretmen: string
  ogrenci_ad: string
  ogrenci_sinif: string
  ogrenci_no: string
  staj_gunu?: number
  staj_gunleri?: string
  miktar: number | null
  calculated_amount?: number
  odeme_tarihi: string
  onay_durumu: string
  ay: number
  yil: number
  dosya_url?: string
  alan_adi?: string
  working_days?: number
  absent_days?: number
  holiday_days?: number
  daily_rate?: number
}

interface FilterOptions {
  ay: string
  alan: string
  ogretmen: string
}

interface SelectableMonth {
  value: string
  label: string
}

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

export default function OgrenciUcretDokumPage() {
  const router = useRouter()
  const [dekontlar, setDekontlar] = useState<DekontData[]>([])
  const [filteredDekontlar, setFilteredDekontlar] = useState<DekontData[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolName, setSchoolName] = useState('')
  const [availableMonths, setAvailableMonths] = useState<SelectableMonth[]>([])
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [ogretmenler, setOgretmenler] = useState<Ogretmen[]>([])
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  
  // Seçilebilir ayları hesapla
  const getSelectableMonths = (): SelectableMonth[] => {
    const now = new Date()
    const currentDay = now.getDate()
    const currentMonth = now.getMonth() + 1
    
    // Ayın son 3 günündeyse (29, 30, 31) mevcut ayı da seçebilir
    const daysInMonth = new Date(now.getFullYear(), currentMonth, 0).getDate()
    const isEndOfMonth = currentDay >= daysInMonth - 2
    
    const months: SelectableMonth[] = []
    
    if (isEndOfMonth) {
      // Mevcut ayı da ekle
      months.push({
        value: currentMonth.toString(),
        label: aylar.find(a => a.value === currentMonth.toString())?.label || ''
      })
    }
    
    // Önceki ayı ekle
    let previousMonth = currentMonth - 1
    
    if (previousMonth === 0) {
      previousMonth = 12
      setCurrentYear(now.getFullYear() - 1)
    }
    
    months.push({
      value: previousMonth.toString(),
      label: aylar.find(a => a.value === previousMonth.toString())?.label || ''
    })
    
    return months
  }
  
  const [filters, setFilters] = useState<FilterOptions>(() => {
    const selectableMonths = getSelectableMonths()
    // Varsayılan olarak önceki ayı seç (liste sonunda)
    const defaultMonth = selectableMonths[selectableMonths.length - 1]
    return {
      ay: defaultMonth?.value || '',
      alan: '', // Başlangıçta boş - zorunlu seçim
      ogretmen: '' // Başlangıçta boş - zorunlu seçim
    }
  })

  // Fetch school name
  const fetchSchoolName = async () => {
    try {
      const response = await fetch('/api/system-settings/school-name')
      if (response.ok) {
        const data = await response.json()
        if (data?.value) {
          setSchoolName(data.value)
        }
      }
    } catch (error) {
      console.error('Okul adı getirme hatası:', error)
    }
  }

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

  // Fetch dekont data
  const fetchDekontlar = async () => {
    // Alan ve öğretmen seçimi zorunlu
    if (!filters.alan || !filters.ogretmen || !filters.ogretmen.trim()) {
      setDekontlar([])
      setFilteredDekontlar([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.ay) params.append('ay', filters.ay)
      params.append('yil', currentYear.toString())
      if (filters.ogretmen) params.append('ogretmen', filters.ogretmen.trim())
      if (filters.alan) params.append('alan', filters.alan)

      const response = await fetch(`/api/admin/araclar/ogrenci-ucret-dokum?${params}`)
      if (response.ok) {
        const result = await response.json()
        setDekontlar(result.data || [])
        setFilteredDekontlar(result.data || [])
      } else {
        const error = await response.json()
        console.error('API Hatası:', error.error)
        setDekontlar([])
        setFilteredDekontlar([])
      }
    } catch (error) {
      console.error('Dekont verileri getirme hatası:', error)
      setDekontlar([])
      setFilteredDekontlar([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch data when filters change - alan ve öğretmen seçildiyse
  useEffect(() => {
    if (filters.ay && filters.alan && filters.ogretmen && filters.ogretmen.trim()) {
      fetchDekontlar()
    } else {
      setDekontlar([])
      setFilteredDekontlar([])
      setLoading(false)
    }
  }, [filters, currentYear])

  // Alan seçimi değişince öğretmenleri getir
  useEffect(() => {
    if (filters.alan) {
      fetchOgretmenler(filters.alan)
      // Alan değişince öğretmen seçimini sıfırla
      setFilters(prev => ({ ...prev, ogretmen: '' }))
    } else {
      setOgretmenler([])
    }
  }, [filters.alan])

  useEffect(() => {
    const months = getSelectableMonths()
    setAvailableMonths(months)
    fetchSchoolName()
    fetchAlanlar()
  }, [])

  const handlePrint = () => {
    // Print content'i klonla
    const printContent = document.getElementById('print-content')
    if (!printContent) return
    
    // Yeni window aç
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    // HTML içeriği oluştur - boş title ile
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title></title>
          <style>
            @page {
              size: A4;
              margin: 1cm;
              @top-left { content: ""; }
              @top-center { content: ""; }
              @top-right { content: ""; }
              @bottom-left { content: ""; }
              @bottom-center { content: ""; }
              @bottom-right { content: ""; }
            }
            @media print {
              @page {
                margin-top: 0.5cm;
                margin-bottom: 0.5cm;
                @top-left { content: none; }
                @top-center { content: none; }
                @top-right { content: none; }
                @bottom-left { content: none; }
                @bottom-center { content: none; }
                @bottom-right { content: none; }
              }
            }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: white; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid black; padding: 4px; font-size: 10px; }
            th { background-color: white; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .mb-2 { margin-bottom: 8px; }
            .mb-8 { margin-bottom: 32px; }
            .mt-4 { margin-top: 16px; }
            .mt-12 { margin-top: 48px; }
            .p-6 { padding: 24px; }
            .px-2 { padding-left: 8px; padding-right: 8px; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .border-b { border-bottom: 1px solid black; }
            .border-t { border-top: 1px solid gray; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .gap-8 { gap: 32px; }
            .mb-16 { margin-bottom: 64px; }
            .pt-2 { padding-top: 8px; }
            .text-xs { font-size: 12px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    
    // Document'i kapat ve yazdır
    printWindow.document.close()
    
    // Print dialog açmadan önce kısa bekle
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 100)
  }

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleMonthChange = (monthValue: string) => {
    setFilters(prev => ({
      ...prev,
      ay: monthValue
    }))
  }

  const handleAlanChange = (alanId: string) => {
    setFilters(prev => ({
      ...prev,
      alan: alanId,
      ogretmen: '' // Alan değişince öğretmen seçimini sıfırla
    }))
  }

  const handleOgretmenChange = (ogretmenName: string) => {
    setFilters(prev => ({
      ...prev,
      ogretmen: ogretmenName
    }))
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'onaylandi':
        return '✓'
      case 'PENDING':
      case 'bekliyor':
        return '?'
      case 'REJECTED':
      case 'reddedildi':
        return '✗'
      default:
        return '-'
    }
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('tr-TR')
  }

  const getMonthName = (monthNum: number) => {
    const monthNames = [
      'OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
      'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'
    ]
    return monthNames[monthNum - 1] || ''
  }


  const formatBolumDal = (alanAdi: string) => {
    // "Elektrik Elektronik" gibi alanları "Elektrik" ve "Elektronik" olarak böl
    const parts = alanAdi?.split(' ') || ['Elektrik', 'Elektronik']
    if (parts.length >= 2) {
      return {
        bolum: parts[0],
        dal: parts.slice(1).join(' ')
      }
    }
    return {
      bolum: parts[0] || 'Elektrik',
      dal: 'Elektronik'
    }
  }

  const selectedMonthName = getMonthName(parseInt(filters.ay))

  return (
    <div className="space-y-6">
      {/* Header - Print olmayacak */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:hidden">
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
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Öğrenci Ücret Dökümü</h1>
                <p className="text-gray-600 text-sm">Öğrenci ücret hesaplama çizelgesi</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Yazdır
            </button>
          </div>
        </div>
      </div>

      {/* Kullanım Uyarısı */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 print:hidden">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Öğrenci Ücret Dökümü Kullanımı</h4>
            <p className="text-blue-800 text-sm">
              Bu sayfa <strong>koordinatör öğretmenlerin</strong> gittikleri işletmelerin ne kadar maaş ödeyeceklerinin dökümünü gösterir.
              İlk etapta <strong>koordinatör öğretmen seçimi zorunludur</strong>, seçime bağlı liste ekrana gelir.
              Sadece <strong>önceki ayın</strong> ücreti hesaplanabilir. Ayın son günlerinde <strong>mevcut ay</strong> da seçilebilir.
            </p>
          </div>
        </div>
      </div>

      {/* Filters - Print olmayacak */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ay 
              <span className="text-xs text-gray-500 ml-1">
                (Sadece önceki ay{availableMonths.length > 1 ? ' veya mevcut ay' : ''})
              </span>
            </label>
            <select
              value={filters.ay}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableMonths.map(ay => (
                <option key={ay.value} value={ay.value}>
                  {ay.label} {currentYear}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alan <span className="text-red-500">*</span>
            </label>
            <select
              value={filters.alan}
              onChange={(e) => handleAlanChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !filters.alan
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
            {!filters.alan && (
              <p className="text-red-500 text-xs mt-1">
                Alan seçimi zorunludur
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Koordinatör Öğretmen <span className="text-red-500">*</span>
            </label>
            <select
              value={filters.ogretmen}
              onChange={(e) => handleOgretmenChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !filters.ogretmen || !filters.ogretmen.trim()
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              required
              disabled={!filters.alan || ogretmenler.length === 0}
            >
              <option value="">Öğretmen seçiniz...</option>
              {ogretmenler.map(ogretmen => (
                <option key={ogretmen.id} value={ogretmen.fullName}>
                  {ogretmen.fullName}
                </option>
              ))}
            </select>
            {(!filters.ogretmen || !filters.ogretmen.trim()) && (
              <p className="text-red-500 text-xs mt-1">
                Koordinatör öğretmen seçimi zorunludur
              </p>
            )}
            {filters.alan && ogretmenler.length === 0 && (
              <p className="text-yellow-600 text-xs mt-1">
                Bu alanda öğretmen bulunamadı
              </p>
            )}
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <div className="font-medium">Toplam: {filteredDekontlar.length} öğrenci</div>
              <div>Yıl: {currentYear}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Content */}
      <div id="print-content" className="bg-white rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none print:rounded-none">
        {/* Başlık */}
        <div className="text-center p-6 border-b border-gray-200 print:border-black">
          <h1 className="text-lg font-bold text-gray-900 mb-2">
            {schoolName.toUpperCase()}
          </h1>
          <h2 className="text-base font-bold text-gray-900 mb-2">
            KOORDİNATÖR ÖĞRETMENLERİN ÖĞRENCİ ÜCRET ÇİZELGESİ
          </h2>
          <h3 className="text-base font-bold text-gray-900">
            {selectedMonthName} {currentYear}
          </h3>
          <div className="text-right mt-4">
            <span className="text-sm">{getCurrentDate()}</span>
          </div>
        </div>

        {/* Tablo */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 print:bg-white">
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">Sınıf</th>
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">No</th>
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">Staj Günleri</th>
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">Bölüm<br/>Dal</th>
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">Adı Soyadı</th>
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">Koordinatör Öğretmen</th>
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">İşletmenin Adı</th>
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">Dvmlı</th>
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">Dvmsiz</th>
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">Tutar</th>
                <th className="border border-gray-300 print:border-black px-2 py-2 text-xs font-bold text-center">Onay</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="border border-gray-300 print:border-black px-4 py-8 text-center text-gray-500">
                    Veriler yükleniyor...
                  </td>
                </tr>
              ) : filteredDekontlar.length === 0 ? (
                <tr>
                  <td colSpan={11} className="border border-gray-300 print:border-black px-4 py-8 text-center text-gray-500">
                    Seçilen öğretmene ait öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredDekontlar.map((dekont, index) => {
                  const bolumDal = formatBolumDal(dekont.alan_adi || 'Elektrik Elektronik')
                  return (
                    <tr key={dekont.id} className="hover:bg-gray-50 print:hover:bg-white">
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs text-center">{dekont.ogrenci_sinif}</td>
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs text-center">{dekont.ogrenci_no}</td>
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs text-center">
                        {dekont.staj_gunleri || '-'}
                      </td>
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs text-center">
                        {bolumDal.bolum}<br/>{bolumDal.dal}
                      </td>
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs">{dekont.ogrenci_ad}</td>
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs">{dekont.koordinator_ogretmen}</td>
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs">{dekont.isletme_ad}</td>
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs text-center">
                        {dekont.working_days || 0}
                      </td>
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs text-center">
                        {dekont.absent_days || 0}
                      </td>
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs text-right">
                        {dekont.calculated_amount ? `${dekont.calculated_amount.toFixed(2)} TL` : (dekont.miktar ? `${dekont.miktar.toFixed(2)} TL` : '0.00 TL')}
                      </td>
                      <td className="border border-gray-300 print:border-black px-2 py-1 text-xs text-center font-bold">
                        {/* Onay sütunu boş kalacak */}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Alt Kısım - İmza Alanları */}
        <div className="p-6 border-t border-gray-200 print:border-black">
          <div className="text-xs text-gray-700 mb-8">
            Koordinatör öğretmen olarak yukarıdaki çizelgede belirtmiş olduğum tutarlardaki dekontları işletmelerden teslim aldığım, yazılı/elektronik 
            ortamda 2 (iki) yıl boyunca saklayacağım, ihtiyaç duyulması halinde ilgililere ibraz edeceğimi kabul ve beyan ederim.
          </div>
          
          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="text-center">
              <div className="mb-16"></div>
              <div className="border-t border-gray-400 pt-2">
                <span className="text-xs font-medium">Koordinatör Öğretmen</span>
              </div>
            </div>
            <div className="text-center">
              <div className="mb-16"></div>
              <div className="border-t border-gray-400 pt-2">
                <span className="text-xs font-medium">Koordinatör Müdür Yardımcısı</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}