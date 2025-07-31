'use client'

import { useState, useEffect } from 'react'
import { Printer, Check, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface Ogretmen {
  id: string
  ad: string
  soyad: string
  email?: string
  telefon?: string
  pin?: string
  alan_id?: number
  alanlar?: any
  stajlarCount?: number
  koordinatorlukCount?: number
  koordinatorluklar?: any[]
  stajlar?: any[]
}

interface SearchParams {
  page?: string
  search?: string
  alan?: string
  per_page?: string
}

interface PrintConfigProps {
  ogretmenler: Ogretmen[]
  searchParams: SearchParams
}

interface PrintOptions {
  includeBasicInfo: boolean
  includeEmail: boolean
  includePhone: boolean
  includeFieldInfo: boolean
  includeCompanyDetails: boolean
  includeStudentDetails: boolean
  includePinInfo: boolean
  includeHeader: boolean
  includeDate: boolean
  includeSummary: boolean
  paperSize: 'A4' | 'A3'
  orientation: 'portrait' | 'landscape'
  customTitle: string
  customSubtitle: string
}

export default function OgretmenlerPrintClient({ ogretmenler, searchParams }: PrintConfigProps) {
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    includeBasicInfo: true,
    includeEmail: true,
    includePhone: true,
    includeFieldInfo: true,
    includeCompanyDetails: false,
    includeStudentDetails: true,
    includePinInfo: false,
    includeHeader: true,
    includeDate: true,
    includeSummary: true,
    paperSize: 'A4',
    orientation: 'landscape',
    customTitle: 'Öğretmen Listesi',
    customSubtitle: 'Koordinatörlük Takip Uygulaması'
  })
  
  const [allTeachers, setAllTeachers] = useState<Ogretmen[]>(ogretmenler)
  const [loadingAllTeachers, setLoadingAllTeachers] = useState(false)
  const [totalTeacherCount, setTotalTeacherCount] = useState(ogretmenler.length)

  const handlePrintOptionChange = (option: keyof PrintOptions, value: boolean | string) => {
    setPrintOptions(prev => ({
      ...prev,
      [option]: value
    }))
  }

  const fetchAllTeachers = async (): Promise<void> => {
    console.log('🚀 fetchAllTeachers başladı...')
    setLoadingAllTeachers(true)
    try {
      // Mevcut arama ve filtre parametrelerini al
      const apiParams = new URLSearchParams()
      if (searchParams.search) apiParams.set('search', searchParams.search)
      if (searchParams.alan && searchParams.alan !== 'all') apiParams.set('alan', searchParams.alan)
      
      const apiUrl = `/api/admin/teachers?${apiParams.toString()}`
      console.log('📡 API URL:', apiUrl)
      
      const response = await fetch(apiUrl)
      console.log('📥 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📋 API tam yanıtı:', data)
        console.log('📊 Gelen öğretmen sayısı:', data.ogretmenler?.length)
        console.log('📈 Total sayısı:', data.total)
        
        if (data.success && data.ogretmenler) {
          // API'den gelen veri formatını mevcut interface'e uyarla
          const adaptedTeachers = data.ogretmenler.map((teacher: any) => ({
            id: teacher.id,
            ad: teacher.name,
            soyad: teacher.surname,
            email: teacher.email,
            telefon: teacher.phone,
            pin: teacher.pin,
            alan_id: teacher.alanId,
            alanlar: teacher.alan ? {
              id: teacher.alan.id,
              ad: teacher.alan.name
            } : null,
            // Yeni API yapısından companies'i koordinatorluklar olarak map et
            koordinatorluklar: teacher.companies?.map((comp: any) => ({
              isletme: {
                id: comp.id,
                name: comp.name
              }
            })) || [],
            // stajlar yapısını da güncelle
            stajlar: teacher.stajlar?.map((staj: any) => ({
              student: staj.student,
              isletme: staj.company // company'yi isletme olarak map et
            })) || [],
            stajlarCount: teacher.stajlar?.length || 0,
            koordinatorlukCount: teacher.companies?.length || 0
          }))
          
          console.log('🏢 Örnek öğretmenin işletmeleri:', adaptedTeachers[0]?.koordinatorluklar)
          console.log('👨‍🎓 Örnek öğretmenin öğrencileri:', adaptedTeachers[0]?.stajlar)
          
          console.log(' Adapted teachers sayısı:', adaptedTeachers.length)
          console.log('🎯 State güncellemesi yapılıyor...')
          
          setAllTeachers(adaptedTeachers)
          setTotalTeacherCount(data.total)
          
          console.log(`✅ Tüm öğretmenler alındı: ${data.total} öğretmen`)
          console.log('✅ State güncellendi!')
          return Promise.resolve()
        } else {
          console.error('❌ API yanıtı geçersiz:', data)
          throw new Error('Geçersiz API yanıtı')
        }
      } else {
        console.error('❌ API hatası, status:', response.status)
        const errorText = await response.text()
        console.error('❌ Error detail:', errorText)
        throw new Error(`API hatası: ${response.status}`)
      }
    } catch (error) {
      console.error('💥 fetchAllTeachers HATA:', error)
      // Hata durumunda mevcut sayfa verilerini kullan
      console.log('🔄 Fallback: mevcut veriler kullanılıyor')
      setAllTeachers(ogretmenler)
      setTotalTeacherCount(ogretmenler.length)
      return Promise.reject(error)
    } finally {
      setLoadingAllTeachers(false)
      console.log('🏁 fetchAllTeachers tamamlandı')
    }
  }

  const generatePrintContent = () => {
    const currentDate = new Date().toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Tüm öğretmenleri alan bazında sırala
    const filteredTeachers = allTeachers.sort((a, b) => {
      // Önce alan adına göre sırala
      const alanA = a.alanlar
        ? (Array.isArray(a.alanlar) ? a.alanlar[0]?.ad : a.alanlar?.ad) || 'ZZZ'
        : 'ZZZ'
      const alanB = b.alanlar
        ? (Array.isArray(b.alanlar) ? b.alanlar[0]?.ad : b.alanlar?.ad) || 'ZZZ'
        : 'ZZZ'
      
      if (alanA !== alanB) {
        return alanA.localeCompare(alanB, 'tr')
      }
      
      // Aynı alantaysa soyad-ad'a göre sırala
      if (a.soyad !== b.soyad) {
        return a.soyad.localeCompare(b.soyad, 'tr')
      }
      
      return a.ad.localeCompare(b.ad, 'tr')
    })
    const totalCount = totalTeacherCount

    // Search and filter info
    const searchInfo = []
    if (searchParams.search) searchInfo.push(`Arama: "${searchParams.search}"`)
    if (searchParams.alan && searchParams.alan !== 'all') {
      const fieldName = filteredTeachers.find(t => 
        (Array.isArray(t.alanlar) ? t.alanlar[0]?.id : t.alanlar?.id) === parseInt(searchParams.alan!)
      )
      if (fieldName) {
        const fieldDisplayName = Array.isArray(fieldName.alanlar) 
          ? fieldName.alanlar[0]?.ad 
          : fieldName.alanlar?.ad
        searchInfo.push(`Alan: "${fieldDisplayName}"`)
      }
    }

    let html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Öğretmen Listesi</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.4;
            color: #333;
            background: white;
          }
          
          .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
          }
          
          .header h1 {
            font-size: 24px;
            color: #1e40af;
            margin-bottom: 10px;
          }
          
          .header .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 10px;
          }
          
          .header .date {
            font-size: 12px;
            color: #9ca3af;
          }
          
          .summary {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #2563eb;
          }
          
          .summary h3 {
            color: #1e40af;
            margin-bottom: 8px;
            font-size: 16px;
          }
          
          .summary-item {
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 4px;
          }
          
          .table-container {
            overflow-x: auto;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          th, td {
            padding: 12px 8px;
            text-align: left;
            border: 1px solid #e5e7eb;
            font-size: 12px;
          }
          
          th {
            background: #f3f4f6;
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          tr:nth-child(even) {
            background: #f9fafb;
          }
          
          tr:hover {
            background: #eff6ff;
          }
          
          .teacher-name {
            font-weight: 600;
            color: #1e40af;
          }
          
          .contact-info {
            font-size: 11px;
            color: #6b7280;
          }
          
          .stats {
            text-align: center;
            font-weight: 500;
          }
          
          .pin-info {
            font-family: 'Courier New', monospace;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
          }
          
          .field-tag {
            background: #dbeafe;
            color: #1e40af;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
          }
          
          .company-details, .student-details {
            font-size: 11px;
            color: #4b5563;
            line-height: 1.4;
            max-width: 200px;
          }
          
          .company-details {
            background: #f0f9ff;
            padding: 4px 8px;
            border-radius: 4px;
          }
          
          .student-details {
            background: #f9fafb;
            padding: 4px 8px;
            border-radius: 4px;
          }
          
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            
            .container {
              padding: 10px;
            }
            
            @page {
              size: ${printOptions.paperSize} ${printOptions.orientation};
              margin: 15mm;
            }
            
            table {
              page-break-inside: auto;
            }
            
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            th {
              background: #f3f4f6 !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
    `

    // Header
    if (printOptions.includeHeader) {
      html += `
        <div class="header">
          <h1>${printOptions.customTitle}</h1>
          <div class="subtitle">${printOptions.customSubtitle}</div>
          ${printOptions.includeDate ? `<div class="date">Rapor Tarihi: ${currentDate}</div>` : ''}
        </div>
      `
    }

    // Summary (opsiyonel)
    if (printOptions.includeSummary) {
      html += `
        <div class="summary">
          <h3>Özet Bilgiler</h3>
          <div class="summary-item"><strong>Toplam Öğretmen:</strong> ${totalCount}</div>
          ${searchInfo.length > 0 ? `<div class="summary-item"><strong>Filtreler:</strong> ${searchInfo.join(', ')}</div>` : ''}
          <div class="summary-item"><strong>Sayfa Düzeni:</strong> ${printOptions.paperSize} - ${printOptions.orientation === 'landscape' ? 'Yatay' : 'Dikey'}</div>
          <div class="summary-item"><strong>Rapor Tarihi:</strong> ${currentDate}</div>
        </div>
      `
    }

    // Table
    html += `
      <div class="table-container">
        <table>
          <thead>
            <tr>
    `

    // Table headers based on selected options
    if (printOptions.includeBasicInfo) {
      html += `<th>Öğretmen Adı</th>`
    }
    if (printOptions.includeEmail) {
      html += `<th>E-posta</th>`
    }
    if (printOptions.includePhone) {
      html += `<th>Telefon</th>`
    }
    if (printOptions.includeFieldInfo) {
      html += `<th>Alan</th>`
    }
    if (printOptions.includeCompanyDetails) {
      html += `<th>İşletmeler</th>`
    }
    if (printOptions.includeStudentDetails) {
      html += `<th>Öğrenciler</th>`
    }
    if (printOptions.includePinInfo) {
      html += `<th>PIN</th>`
    }

    html += `
            </tr>
          </thead>
          <tbody>
    `

    // Table rows
    filteredTeachers.forEach(teacher => {
      html += `<tr>`
      
      if (printOptions.includeBasicInfo) {
        html += `<td class="teacher-name">${teacher.ad} ${teacher.soyad}</td>`
      }
      
      if (printOptions.includeEmail) {
        html += `<td class="contact-info">${teacher.email || '-'}</td>`
      }
      
      if (printOptions.includePhone) {
        html += `<td class="contact-info">${teacher.telefon || '-'}</td>`
      }
      
      if (printOptions.includeFieldInfo) {
        const fieldName = teacher.alanlar 
          ? (Array.isArray(teacher.alanlar) 
            ? teacher.alanlar[0]?.ad || 'Bilinmiyor'
            : teacher.alanlar?.ad || 'Bilinmiyor')
          : '-'
        html += `<td><span class="field-tag">${fieldName}</span></td>`
      }
      
      if (printOptions.includeCompanyDetails) {
        const companies = teacher.koordinatorluklar?.map((k: any) => {
          const companyName = k.isletme?.name || 'Bilinmiyor'
          const companyCity = k.isletme?.city ? ` (${k.isletme.city})` : ''
          return companyName + companyCity
        }).filter(Boolean) || []
        const companiesText = companies.length > 0 ? companies.join('<br>') : '-'
        html += `<td class="company-details">${companiesText}</td>`
      }
      
      if (printOptions.includeStudentDetails) {
        // Öğrencileri işletme bazında grupla
        const studentsByCompany: { [companyName: string]: any[] } = {}
        
        teacher.stajlar?.forEach((s: any) => {
          if (!s.student) return
          const companyName = s.isletme?.name || 'Bilinmeyen İşletme'
          if (!studentsByCompany[companyName]) {
            studentsByCompany[companyName] = []
          }
          studentsByCompany[companyName].push(s.student)
        })
        
        // Her işletme için öğrencileri formatla
        const formattedCompanies = Object.entries(studentsByCompany).map(([companyName, students]) => {
          const studentList = students.map(student => {
            const studentNumber = student.number ? ` (${student.number})` : ''
            const studentClass = student.class?.name ? ` - ${student.class.name}` : ''
            return `• ${student.name} ${student.surname}${studentNumber}${studentClass}`
          }).join('<br>')
          
          return `<strong>${companyName}:</strong><br>${studentList}`
        })
        
        const studentsText = formattedCompanies.length > 0
          ? formattedCompanies.join('<br><br>')
          : '-'
        html += `<td class="student-details">${studentsText}</td>`
      }
      
      if (printOptions.includePinInfo) {
        html += `<td class="pin-info">${teacher.pin || '-'}</td>`
      }
      
      html += `</tr>`
    })

    html += `
          </tbody>
        </table>
      </div>
    `

    // Footer
    html += `
      <div class="footer">
        Bu rapor ${currentDate} tarihinde oluşturulmuştur. • ${printOptions.customSubtitle}
      </div>
    `

    html += `
        </div>
      </body>
      </html>
    `

    return html
  }

  const handlePrint = async () => {
    // Önce tüm öğretmenlerin yüklendiğinden emin ol
    if (loadingAllTeachers) {
      alert('Veriler henüz yükleniyor, lütfen bekleyin...')
      return
    }
    
    // Eğer modal açılmış ama henüz veri yüklenmemişse bekle
    if (allTeachers.length <= ogretmenler.length) {
      console.log(`🔄 Tüm veriler henüz yüklenmemiş (mevcut: ${allTeachers.length}, beklenen: tümü), yeniden yükleniyor...`)
      try {
        await fetchAllTeachers()
        console.log(`✅ Print için ${allTeachers.length} öğretmen hazırlandı`)
      } catch (error) {
        console.error('❌ Veriler yüklenemedi:', error)
        alert('Veriler yüklenirken hata oluştu. Mevcut sayfa verileri ile yazdırılacak.')
      }
    }
    
    const printContent = generatePrintContent()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
        printWindow.onafterprint = () => {
          printWindow.close()
        }
      }
    }
    setPrintModalOpen(false)
  }

  // Modal açıldığında tüm öğretmenleri getir
  useEffect(() => {
    if (printModalOpen) {
      fetchAllTeachers()
    }
  }, [printModalOpen])

  return (
    <>
      <button
        onClick={() => setPrintModalOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        title="Öğretmen listesini yazdır"
      >
        <Printer className="h-4 w-4 mr-2" />
        Yazdır
      </button>

      <Modal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Yazdırma Ayarları"
      >
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Printer className="h-5 w-5" />
              <span className="font-medium">Yazdırılacak Liste</span>
            </div>
            <div className="text-sm text-blue-600">
              {loadingAllTeachers ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span>Tüm öğretmenler yükleniyor...</span>
                </div>
              ) : (
                <>
                  <strong>{totalTeacherCount} öğretmen</strong> yazdırılacak
                  {searchParams.search && (
                    <div>Arama: "{searchParams.search}"</div>
                  )}
                  {searchParams.alan && searchParams.alan !== 'all' && (
                    <div>Alan filtresi aktif</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Custom Headers */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Başlık Ayarları</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ana Başlık</label>
                <input
                  type="text"
                  value={printOptions.customTitle}
                  onChange={(e) => handlePrintOptionChange('customTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Öğretmen Listesi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alt Başlık</label>
                <input
                  type="text"
                  value={printOptions.customSubtitle}
                  onChange={(e) => handlePrintOptionChange('customSubtitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Koordinatörlük Takip Uygulaması"
                />
              </div>
            </div>
          </div>

          {/* Print Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dahil Edilecek Bilgiler</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeBasicInfo}
                  onChange={(e) => handlePrintOptionChange('includeBasicInfo', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">Temel Bilgiler (Ad, Soyad)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeEmail}
                  onChange={(e) => handlePrintOptionChange('includeEmail', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">E-posta Adresi</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includePhone}
                  onChange={(e) => handlePrintOptionChange('includePhone', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">Telefon Numarası</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeFieldInfo}
                  onChange={(e) => handlePrintOptionChange('includeFieldInfo', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">Alan Bilgisi</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeCompanyDetails}
                  onChange={(e) => handlePrintOptionChange('includeCompanyDetails', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">Ayrı İşletme Sütunu (Opsiyonel)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeStudentDetails}
                  onChange={(e) => handlePrintOptionChange('includeStudentDetails', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">Öğrenci ve İşletme Detayları (İşletme bazında gruplanmış)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includePinInfo}
                  onChange={(e) => handlePrintOptionChange('includePinInfo', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">PIN Bilgileri (Güvenlik)</span>
              </label>
            </div>
          </div>

          {/* Page Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sayfa Ayarları</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kağıt Boyutu</label>
                <select
                  value={printOptions.paperSize}
                  onChange={(e) => handlePrintOptionChange('paperSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sayfa Yönü</label>
                <select
                  value={printOptions.orientation}
                  onChange={(e) => handlePrintOptionChange('orientation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="portrait">Dikey</option>
                  <option value="landscape">Yatay (Önerilen)</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={printOptions.includeHeader}
                    onChange={(e) => handlePrintOptionChange('includeHeader', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  <span className="text-sm text-gray-700">Sayfa Başlığı Ekle</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={printOptions.includeDate}
                    onChange={(e) => handlePrintOptionChange('includeDate', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  <span className="text-sm text-gray-700">Tarih Bilgisi Ekle</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={printOptions.includeSummary}
                    onChange={(e) => handlePrintOptionChange('includeSummary', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  <span className="text-sm text-gray-700">Özet Bilgiler (Sayfa düzeni, toplam sayı, filtreler)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setPrintModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4 mr-2 inline" />
              İptal
            </button>
            <button
              onClick={handlePrint}
              disabled={loadingAllTeachers}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-4 w-4 mr-2 inline" />
              {loadingAllTeachers ? 'Yükleniyor...' : 'Yazdır'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}