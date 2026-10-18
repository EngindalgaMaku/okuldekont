'use client'

import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { Printer, Check, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface Company {
  id: string
  name: string
  contact?: string
  phone?: string
  address?: string
  pin?: string
  masterTeacherName?: string
  masterTeacherPhone?: string
  _count?: {
    students: number
  }
  teacher?: {
    name: string
    surname: string
  }
  students?: Array<{
    id: string
    name: string
    surname: string
    number?: string
    class?: {
      id: string
      name: string
    }
  }>
}

interface SearchParams {
  page?: string
  search?: string
  filter?: string
  per_page?: string
}

interface PrintConfigProps {
  companies: Company[]
  searchParams: SearchParams
  externalPrintModalOpen?: boolean
  onExternalClose?: () => void
  hideButton?: boolean
}

interface PrintOptions {
  includeBasicInfo: boolean
  includeContactInfo: boolean
  includeAddress: boolean
  includeTeacherInfo: boolean
  includeStudentDetails: boolean
  includeUstaOgretici: boolean
  includePinInfo: boolean
  includeHeader: boolean
  includeDate: boolean
  includeSummary: boolean
  paperSize: 'A4' | 'A3'
  orientation: 'portrait' | 'landscape'
  customTitle: string
  customSubtitle: string
}

export default function IsletmelerPrintClient({
  companies,
  searchParams,
  externalPrintModalOpen,
  onExternalClose,
  hideButton = false
}: PrintConfigProps) {
  const [internalPrintModalOpen, setInternalPrintModalOpen] = useState(false)
  
  // Use external state if provided, otherwise use internal state
  const printModalOpen = externalPrintModalOpen !== undefined ? externalPrintModalOpen : internalPrintModalOpen
  const setPrintModalOpen = onExternalClose ? onExternalClose : setInternalPrintModalOpen
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    includeBasicInfo: true,
    includeContactInfo: true,
    includeAddress: true,
    includeTeacherInfo: true,
    includeStudentDetails: true,
    includeUstaOgretici: false,
    includePinInfo: false,
    includeHeader: true,
    includeDate: true,
    includeSummary: true,
    paperSize: 'A4',
    orientation: 'landscape',
    customTitle: 'İşletme Listesi',
    customSubtitle: 'Koordinatörlük Takip Uygulaması'
  })
  
  const [allCompanies, setAllCompanies] = useState<Company[]>(companies)
  const [loadingAllCompanies, setLoadingAllCompanies] = useState(false)
  const [totalCompanyCount, setTotalCompanyCount] = useState(companies.length)

  const handlePrintOptionChange = (option: keyof PrintOptions, value: boolean | string) => {
    setPrintOptions(prev => ({
      ...prev,
      [option]: value
    }))
  }

  const fetchAllCompanies = async (): Promise<void> => {
    setLoadingAllCompanies(true)
    try {
      // Mevcut arama ve filtre parametrelerini al
      const apiParams = new URLSearchParams()
      if (searchParams.search) apiParams.set('search', searchParams.search)
      if (searchParams.filter && searchParams.filter !== 'all') apiParams.set('filter', searchParams.filter)
      
      const apiUrl = `/api/admin/companies/all?${apiParams.toString()}`
      
      const response = await fetch(apiUrl)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.companies) {
          setAllCompanies(data.companies)
          setTotalCompanyCount(data.total)
          
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
      console.error('💥 fetchAllCompanies HATA:', error)
      // Hata durumunda mevcut sayfa verilerini kullan
      setAllCompanies(companies)
      setTotalCompanyCount(companies.length)
      return Promise.reject(error)
    } finally {
      setLoadingAllCompanies(false)
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

    // Tüm işletmeleri kullan (sayfalama olmadan)
    const filteredCompanies = allCompanies.sort((a, b) => {
      return a.name.localeCompare(b.name, 'tr')
    })
    const totalCount = totalCompanyCount

    // Search and filter info
    const searchInfo = []
    if (searchParams.search) searchInfo.push(`Arama: "${searchParams.search}"`)
    if (searchParams.filter && searchParams.filter !== 'all') {
      const filterText = searchParams.filter === 'active' ? 'Aktif Stajı Olanlar' : 
                        searchParams.filter === 'empty' ? 'Boş İşletmeler' : searchParams.filter
      searchInfo.push(`Filtre: "${filterText}"`)
    }

    let html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>İşletme Listesi</title>
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
          
          .company-name {
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
          
          .address-info {
            font-size: 11px;
            color: #4b5563;
            line-height: 1.4;
            max-width: 200px;
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
          <div class="summary-item"><strong>Toplam İşletme:</strong> ${totalCount}</div>
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
      html += `<th>İşletme Adı</th>`
    }
    if (printOptions.includeContactInfo) {
      html += `<th>Yetkili & İletişim</th>`
    }
    if (printOptions.includeAddress) {
      html += `<th>Adres</th>`
    }
    if (printOptions.includeTeacherInfo) {
      html += `<th>Koordinatör</th>`
    }
    if (printOptions.includeStudentDetails) {
      html += `<th>Öğrenciler</th>`
    }
    if (printOptions.includeUstaOgretici) {
      html += `<th>Usta Öğretici</th>`
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
    filteredCompanies.forEach(company => {
      html += `<tr>`
      
      if (printOptions.includeBasicInfo) {
        html += `<td class="company-name">${company.name}</td>`
      }
      
      if (printOptions.includeContactInfo) {
        let contactInfo = ''
        if (company.contact) contactInfo += `👤 ${company.contact}<br>`
        if (company.phone) contactInfo += `📞 ${company.phone}`
        html += `<td class="contact-info">${contactInfo || '-'}</td>`
      }
      
      if (printOptions.includeAddress) {
        html += `<td class="address-info">${company.address || '-'}</td>`
      }
      
      if (printOptions.includeTeacherInfo) {
        const teacherName = company.teacher 
          ? `${company.teacher.name} ${company.teacher.surname}`
          : '-'
        html += `<td>${teacherName}</td>`
      }
      
      if (printOptions.includeStudentDetails) {
        // Öğrenci detaylarını göster
        let studentsList = ''
        if (company.students && company.students.length > 0) {
          const studentItems = company.students.map(student => {
            const name = `${student.name} ${student.surname}`
            const number = student.number ? ` (${student.number})` : ''
            const className = student.class?.name ? ` - ${student.class.name}` : ''
            return `• ${name}${number}${className}`
          }).join('<br>')
          studentsList = studentItems
        } else {
          studentsList = 'Öğrenci yok'
        }
        html += `<td style="font-size: 11px; line-height: 1.4;">${studentsList}</td>`
      }
      
      if (printOptions.includeUstaOgretici) {
        let ustaInfo = ''
        if (company.masterTeacherName) ustaInfo += `👤 ${company.masterTeacherName}<br>`
        if (company.masterTeacherPhone) ustaInfo += `📞 ${company.masterTeacherPhone}`
        html += `<td class="contact-info">${ustaInfo || '-'}</td>`
      }
      
      if (printOptions.includePinInfo) {
        html += `<td class="pin-info">${company.pin || '-'}</td>`
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
    // Önce tüm işletmelerin yüklendiğinden emin ol
    if (loadingAllCompanies) {
      toast('Veriler henüz yükleniyor, lütfen bekleyin...', { icon: '⏳' })
      return
    }
    
    // Eğer modal açılmış ama henüz veri yüklenmemişse bekle
    if (allCompanies.length <= companies.length) {
      try {
        await fetchAllCompanies()
      } catch (error) {
        console.error('❌ Veriler yüklenemedi:', error)
        toast('Veriler yüklenirken hata oluştu. Mevcut sayfa verileri ile yazdırılacak.', { icon: '⚠️' })
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
    if (onExternalClose) {
      onExternalClose()
    } else {
      setInternalPrintModalOpen(false)
    }
  }

  // Modal açıldığında tüm işletmeleri getir
  useEffect(() => {
    if (printModalOpen) {
      fetchAllCompanies()
    }
  }, [printModalOpen])

  return (
    <>
      {!hideButton && (
        <button
          onClick={() => {
            if (onExternalClose) {
              // External control case - this shouldn't be called when hideButton is true
            } else {
              setInternalPrintModalOpen(true)
            }
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          title="İşletme listesini yazdır"
        >
          <Printer className="h-4 w-4 mr-2" />
          Yazdır
        </button>
      )}

      <Modal
        isOpen={printModalOpen}
        onClose={() => {
          if (onExternalClose) {
            onExternalClose()
          } else {
            setInternalPrintModalOpen(false)
          }
        }}
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
              {loadingAllCompanies ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span>Tüm işletmeler yükleniyor...</span>
                </div>
              ) : (
                <>
                  <strong>{totalCompanyCount} işletme</strong> yazdırılacak
                  {searchParams.search && (
                    <div>Arama: "{searchParams.search}"</div>
                  )}
                  {searchParams.filter && searchParams.filter !== 'all' && (
                    <div>Filtre aktif</div>
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
                  placeholder="İşletme Listesi"
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
                <span className="text-sm text-gray-700">Temel Bilgiler (İşletme Adı)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeContactInfo}
                  onChange={(e) => handlePrintOptionChange('includeContactInfo', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">İletişim Bilgileri (Yetkili, Telefon)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeAddress}
                  onChange={(e) => handlePrintOptionChange('includeAddress', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">Adres Bilgisi</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeTeacherInfo}
                  onChange={(e) => handlePrintOptionChange('includeTeacherInfo', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">Koordinatör Bilgisi</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeStudentDetails}
                  onChange={(e) => handlePrintOptionChange('includeStudentDetails', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">Öğrenci Detayları (Ad, Numara, Sınıf)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeUstaOgretici}
                  onChange={(e) => handlePrintOptionChange('includeUstaOgretici', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <span className="text-sm text-gray-700">Usta Öğretici Bilgileri</span>
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
              disabled={loadingAllCompanies}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-4 w-4 mr-2 inline" />
              {loadingAllCompanies ? 'Yükleniyor...' : 'Yazdır'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}