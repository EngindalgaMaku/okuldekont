'use client'

import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { Printer, Check, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface Student {
  id: string
  name: string
  surname: string
  number?: string
  className: string
  alanId: string
  tcNo?: string
  phone?: string
  email?: string
  parentName?: string
  parentPhone?: string
  alan?: {
    id: string
    name: string
  }
  company?: {
    id: string
    name: string
    contact: string
    teacher?: {
      id: string
      name: string
      surname: string
      alanId?: string
      alan?: {
        id: string
        name: string
      }
    }
  }
  internshipStatus?: {
    id: string
    status: string
    startDate: string
    endDate: string
  }
}

interface SearchParams {
  page?: string
  search?: string
  alanId?: string
  sinif?: string
  status?: string
  per_page?: string
}

interface PrintConfigProps {
  students: Student[]
  searchParams: SearchParams
  isDropdownItem?: boolean
  onClose?: () => void
}

interface PrintOptions {
  includeBasicInfo: boolean
  includeContactInfo: boolean
  includePersonalInfo: boolean
  includeParentInfo: boolean
  includeFieldInfo: boolean
  includeCompanyInfo: boolean
  includeInternshipStatus: boolean
  includeHeader: boolean
  includeDate: boolean
  includeSummary: boolean
  paperSize: 'A4' | 'A3'
  orientation: 'portrait' | 'landscape'
  customTitle: string
  customSubtitle: string
}

export default function OgrencilerPrintClient({
  students,
  searchParams,
  isDropdownItem = false,
  onClose
}: PrintConfigProps) {
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    includeBasicInfo: true,
    includeContactInfo: true,
    includePersonalInfo: false,
    includeParentInfo: true,
    includeFieldInfo: true,
    includeCompanyInfo: true,
    includeInternshipStatus: true,
    includeHeader: true,
    includeDate: true,
    includeSummary: true,
    paperSize: 'A4',
    orientation: 'landscape',
    customTitle: 'Öğrenci Listesi',
    customSubtitle: 'Koordinatörlük Takip Uygulaması'
  })
  
  const [allStudents, setAllStudents] = useState<Student[]>(students)
  const [loadingAllStudents, setLoadingAllStudents] = useState(false)
  const [totalStudentCount, setTotalStudentCount] = useState(students.length)

  const handlePrintOptionChange = (option: keyof PrintOptions, value: boolean | string) => {
    setPrintOptions(prev => ({
      ...prev,
      [option]: value
    }))
  }

  const fetchAllStudents = async (): Promise<void> => {
    setLoadingAllStudents(true)
    try {
      // Mevcut arama ve filtre parametrelerini al
      const apiParams = new URLSearchParams()
      if (searchParams.search) apiParams.set('search', searchParams.search)
      if (searchParams.alanId && searchParams.alanId !== 'all') apiParams.set('alanId', searchParams.alanId)
      if (searchParams.sinif && searchParams.sinif !== 'all') apiParams.set('sinif', searchParams.sinif)
      if (searchParams.status && searchParams.status !== 'all') apiParams.set('status', searchParams.status)
      
      const apiUrl = `/api/admin/students/all?${apiParams.toString()}`
      
      const response = await fetch(apiUrl)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.students) {
          setAllStudents(data.students)
          setTotalStudentCount(data.total)
          
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
      console.error('💥 fetchAllStudents HATA:', error)
      // Hata durumunda mevcut sayfa verilerini kullan
      setAllStudents(students)
      setTotalStudentCount(students.length)
      return Promise.reject(error)
    } finally {
      setLoadingAllStudents(false)
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

    // Tüm öğrencileri kullan (sayfalama olmadan)
    const filteredStudents = allStudents.sort((a, b) => {
      return `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, 'tr')
    })
    const totalCount = totalStudentCount

    // Search and filter info
    const searchInfo = []
    if (searchParams.search) searchInfo.push(`Arama: "${searchParams.search}"`)
    if (searchParams.alanId && searchParams.alanId !== 'all') {
      searchInfo.push(`Alan Filtresi Aktif`)
    }
    if (searchParams.sinif && searchParams.sinif !== 'all') {
      searchInfo.push(`Sınıf: "${searchParams.sinif}"`)
    }
    if (searchParams.status && searchParams.status !== 'all') {
      const statusText = searchParams.status === 'active' ? 'Aktif Stajda' : 
                        searchParams.status === 'unassigned' ? 'Atanmamış' :
                        searchParams.status === 'terminated' ? 'Fesih Edilmiş' :
                        searchParams.status === 'completed' ? 'Tamamlanmış' : searchParams.status
      searchInfo.push(`Durum: "${statusText}"`)
    }

    let html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Öğrenci Listesi</title>
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
          
          .student-name {
            font-weight: 600;
            color: #1e40af;
          }
          
          .contact-info {
            font-size: 11px;
            color: #6b7280;
          }
          
          .status-active {
            background: #dcfce7;
            color: #166534;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
          }
          
          .status-unassigned {
            background: #fee2e2;
            color: #991b1b;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
          }
          
          .status-terminated {
            background: #fef3c7;
            color: #92400e;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
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
          <div class="summary-item"><strong>Toplam Öğrenci:</strong> ${totalCount}</div>
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
      html += `<th>Öğrenci Bilgileri</th>`
    }
    if (printOptions.includeContactInfo) {
      html += `<th>İletişim</th>`
    }
    if (printOptions.includePersonalInfo) {
      html += `<th>TC Kimlik</th>`
    }
    if (printOptions.includeParentInfo) {
      html += `<th>Veli Bilgileri</th>`
    }
    if (printOptions.includeFieldInfo) {
      html += `<th>Alan</th>`
    }
    if (printOptions.includeCompanyInfo) {
      html += `<th>İşletme</th>`
    }
    if (printOptions.includeInternshipStatus) {
      html += `<th>Staj Durumu</th>`
    }

    html += `
            </tr>
          </thead>
          <tbody>
    `

    // Table rows
    filteredStudents.forEach(student => {
      html += `<tr>`
      
      if (printOptions.includeBasicInfo) {
        html += `<td class="student-name">
          <div><strong>${student.name} ${student.surname}</strong></div>
          <div style="font-size: 11px; color: #6b7280;">
            ${student.className} - No: ${student.number || 'Belirtilmemiş'}
          </div>
        </td>`
      }
      
      if (printOptions.includeContactInfo) {
        let contactInfo = ''
        if (student.phone) contactInfo += `📞 ${student.phone}<br>`
        if (student.email) contactInfo += `📧 ${student.email}`
        html += `<td class="contact-info">${contactInfo || '-'}</td>`
      }
      
      if (printOptions.includePersonalInfo) {
        html += `<td style="font-size: 11px;">${student.tcNo || '-'}</td>`
      }
      
      if (printOptions.includeParentInfo) {
        let parentInfo = ''
        if (student.parentName) parentInfo += `👤 ${student.parentName}<br>`
        if (student.parentPhone) parentInfo += `📞 ${student.parentPhone}`
        html += `<td class="contact-info">${parentInfo || '-'}</td>`
      }
      
      if (printOptions.includeFieldInfo) {
        html += `<td>${student.alan?.name || 'Alan Belirtilmemiş'}</td>`
      }
      
      if (printOptions.includeCompanyInfo) {
        if (student.company) {
          let companyInfo = `<div style="font-weight: 600;">${student.company.name}</div>`
          if (student.company.contact) companyInfo += `<div style="font-size: 11px; color: #6b7280;">👤 ${student.company.contact}</div>`
          if (student.company.teacher) {
            companyInfo += `<div style="font-size: 11px; color: #6b7280;">👨‍🏫 ${student.company.teacher.name} ${student.company.teacher.surname}</div>`
          }
          html += `<td>${companyInfo}</td>`
        } else {
          html += `<td><span class="status-unassigned">Atanmamış</span></td>`
        }
      }
      
      if (printOptions.includeInternshipStatus) {
        if (student.internshipStatus) {
          const statusClass = student.internshipStatus.status === 'ACTIVE' ? 'status-active' :
                             student.internshipStatus.status === 'TERMINATED' ? 'status-terminated' : 'status-unassigned'
          const statusText = student.internshipStatus.status === 'ACTIVE' ? 'Aktif' :
                           student.internshipStatus.status === 'TERMINATED' ? 'Fesih Edilmiş' :
                           student.internshipStatus.status === 'COMPLETED' ? 'Tamamlanmış' : student.internshipStatus.status
          html += `<td><span class="${statusClass}">${statusText}</span></td>`
        } else {
          html += `<td><span class="status-unassigned">Staj Yok</span></td>`
        }
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
    // Önce tüm öğrencilerin yüklendiğinden emin ol
    if (loadingAllStudents) {
      toast('Veriler henüz yükleniyor, lütfen bekleyin...', { icon: '⏳' })
      return
    }
    
    // Eğer modal açılmış ama henüz veri yüklenmemişse bekle
    if (allStudents.length <= students.length) {
      try {
        await fetchAllStudents()
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
    setPrintModalOpen(false)
  }

  // Modal açıldığında tüm öğrencileri getir
  useEffect(() => {
    if (printModalOpen) {
      fetchAllStudents()
    }
  }, [printModalOpen])

  const handleOpenModal = () => {
    setPrintModalOpen(true)
    if (onClose) onClose()
  }

  return (
    <>
      {isDropdownItem ? (
        <button
          onClick={handleOpenModal}
          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center gap-3"
        >
          <Printer className="w-4 h-4 text-purple-500" />
          <div>
            <div className="font-medium">Listeyi Yazdır</div>
            <div className="text-xs text-gray-500">Öğrenci listesini yazdır</div>
          </div>
        </button>
      ) : (
        <button
          onClick={() => setPrintModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          title="Öğrenci listesini yazdır"
        >
          <Printer className="h-4 w-4 mr-2" />
          Yazdır
        </button>
      )}

      <Modal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Yazdırma Ayarları"
      >
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-700 mb-2">
              <Printer className="h-5 w-5" />
              <span className="font-medium">Yazdırılacak Liste</span>
            </div>
            <div className="text-sm text-purple-600">
              {loadingAllStudents ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                  <span>Tüm öğrenciler yükleniyor...</span>
                </div>
              ) : (
                <>
                  <strong>{totalStudentCount} öğrenci</strong> yazdırılacak
                  {searchParams.search && (
                    <div>Arama: "{searchParams.search}"</div>
                  )}
                  {searchParams.alanId && searchParams.alanId !== 'all' && (
                    <div>Alan filtresi aktif</div>
                  )}
                  {searchParams.sinif && searchParams.sinif !== 'all' && (
                    <div>Sınıf: "{searchParams.sinif}"</div>
                  )}
                  {searchParams.status && searchParams.status !== 'all' && (
                    <div>Durum filtresi aktif</div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Öğrenci Listesi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alt Başlık</label>
                <input
                  type="text"
                  value={printOptions.customSubtitle}
                  onChange={(e) => handlePrintOptionChange('customSubtitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
                />
                <span className="text-sm text-gray-700">Temel Bilgiler (Ad, Soyad, Sınıf, Numara)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeContactInfo}
                  onChange={(e) => handlePrintOptionChange('includeContactInfo', e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
                />
                <span className="text-sm text-gray-700">İletişim Bilgileri (Telefon, Email)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includePersonalInfo}
                  onChange={(e) => handlePrintOptionChange('includePersonalInfo', e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
                />
                <span className="text-sm text-gray-700">Kişisel Bilgiler (TC Kimlik No)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeParentInfo}
                  onChange={(e) => handlePrintOptionChange('includeParentInfo', e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
                />
                <span className="text-sm text-gray-700">Veli Bilgileri (Veli Adı, Telefonu)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeFieldInfo}
                  onChange={(e) => handlePrintOptionChange('includeFieldInfo', e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
                />
                <span className="text-sm text-gray-700">Alan Bilgisi</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeCompanyInfo}
                  onChange={(e) => handlePrintOptionChange('includeCompanyInfo', e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
                />
                <span className="text-sm text-gray-700">İşletme Bilgileri (İşletme, Yetkili, Koordinatör)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.includeInternshipStatus}
                  onChange={(e) => handlePrintOptionChange('includeInternshipStatus', e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
                />
                <span className="text-sm text-gray-700">Staj Durumu</span>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
                  />
                  <span className="text-sm text-gray-700">Sayfa Başlığı Ekle</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={printOptions.includeDate}
                    onChange={(e) => handlePrintOptionChange('includeDate', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
                  />
                  <span className="text-sm text-gray-700">Tarih Bilgisi Ekle</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={printOptions.includeSummary}
                    onChange={(e) => handlePrintOptionChange('includeSummary', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
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
              disabled={loadingAllStudents}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-4 w-4 mr-2 inline" />
              {loadingAllStudents ? 'Yükleniyor...' : 'Yazdır'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}