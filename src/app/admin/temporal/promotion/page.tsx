'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Users, 
  GraduationCap, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Eye,
  Play,
  Download,
  Calendar,
  BookOpen
} from 'lucide-react'
import Link from 'next/link'

interface PromotionPreview {
  current_grade: string
  current_grade_type: string
  new_grade: string
  new_grade_type: string
  student_count: number
  students: Array<{
    id: string
    name: string
    current_enrollment: {
      grade: string
      grade_type: string
      education_year: string
    }
  }>
}

export default function PromotionPage() {
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [preview, setPreview] = useState<PromotionPreview[]>([])
  const [promotionResults, setPromotionResults] = useState<any>(null)
  const [selectedEducationYear, setSelectedEducationYear] = useState('')
  const [targetEducationYear, setTargetEducationYear] = useState('')
  const [educationYears, setEducationYears] = useState<any[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const fetchEducationYears = async () => {
    try {
      const response = await fetch('/api/admin/education-years')
      if (!response.ok) throw new Error('Eğitim yılları getirilemedi')
      const data = await response.json()
      setEducationYears(data)
      
      // Aktif eğitim yılını varsayılan olarak seç
      const activeYear = data.find((year: any) => year.active)
      if (activeYear) {
        setSelectedEducationYear(activeYear.id)
      }
    } catch (error) {
      console.error('Eğitim yılları çekilirken hata:', error)
    }
  }

  const generatePreview = async () => {
    if (!selectedEducationYear) {
      alert('Lütfen kaynak eğitim yılını seçin')
      return
    }

    setPreviewLoading(true)
    try {
      const response = await fetch('/api/admin/student-enrollments/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          education_year_id: selectedEducationYear,
          target_year_id: targetEducationYear || undefined,
          preview: true
        })
      })

      if (!response.ok) throw new Error('Önizleme oluşturulamadı')
      
      const data = await response.json()
      setPreview(data.preview || [])
      setPromotionResults(null)
    } catch (error) {
      console.error('Önizleme oluşturma hatası:', error)
      alert('Önizleme oluşturulurken bir hata oluştu')
    }
    setPreviewLoading(false)
  }

  const executePromotion = async () => {
    if (!selectedEducationYear) {
      alert('Lütfen kaynak eğitim yılını seçin')
      return
    }

    if (preview.length === 0) {
      alert('Önce önizleme oluşturun')
      return
    }

    setPromoting(true)
    try {
      const response = await fetch('/api/admin/student-enrollments/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          education_year_id: selectedEducationYear,
          target_year_id: targetEducationYear || undefined,
          preview: false
        })
      })

      if (!response.ok) throw new Error('Sınıf yükseltme başarısız')
      
      const data = await response.json()
      setPromotionResults(data)
      setPreview([])
      setShowConfirmModal(false)
    } catch (error) {
      console.error('Sınıf yükseltme hatası:', error)
      alert('Sınıf yükseltme sırasında bir hata oluştu')
    }
    setPromoting(false)
  }

  const exportPreview = () => {
    if (preview.length === 0) {
      alert('Dışa aktarılacak önizleme bulunamadı')
      return
    }

    const csvContent = preview.flatMap(group => 
      group.students.map(student => 
        `"${student.name}","${group.current_grade}","${group.current_grade_type}","${group.new_grade}","${group.new_grade_type}"`
      )
    ).join('\n')

    const header = 'Öğrenci Adı,Mevcut Sınıf,Mevcut Tip,Yeni Sınıf,Yeni Tip\n'
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `sinif-yukseltme-onizleme-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getTotalStudents = () => {
    return preview.reduce((total, group) => total + group.student_count, 0)
  }

  useEffect(() => {
    fetchEducationYears()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/temporal"
              className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Sınıf Yükseltme İşlemleri
              </h1>
              <p className="text-gray-600 mt-2">Öğrencilerin otomatik sınıf yükseltme işlemlerini gerçekleştirin</p>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6 mb-8">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-indigo-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Yükseltme Ayarları</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kaynak Eğitim Yılı</label>
              <select
                value={selectedEducationYear}
                onChange={(e) => setSelectedEducationYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Eğitim yılı seçin</option>
                {educationYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year} {year.active && '(Aktif)'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Öğrencilerin yükseltileceği kaynak eğitim yılı</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hedef Eğitim Yılı (İsteğe Bağlı)</label>
              <select
                value={targetEducationYear}
                onChange={(e) => setTargetEducationYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Otomatik oluştur</option>
                {educationYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Boş bırakılırsa otomatik oluşturulur</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedEducationYear && (
                <>
                  Seçilen yıl: <strong>
                    {educationYears.find(y => y.id === selectedEducationYear)?.year || 'Bilinmiyor'}
                  </strong>
                </>
              )}
            </div>
            
            <div className="flex space-x-3">
              {preview.length > 0 && (
                <button
                  onClick={exportPreview}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Önizleme İndir
                </button>
              )}
              
              <button
                onClick={generatePreview}
                disabled={previewLoading || !selectedEducationYear}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {previewLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                {previewLoading ? 'Hesaplanıyor...' : 'Önizleme Oluştur'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Results */}
        {preview.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-indigo-600" />
                Yükseltme Önizlemesi
              </h3>
              <div className="text-sm text-gray-600">
                Toplam <strong>{getTotalStudents()}</strong> öğrenci etkilenecek
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {preview.map((group, index) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{group.current_grade}</span>
                          <span className="text-sm text-gray-600">({group.current_grade_type})</span>
                        </div>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-green-700">{group.new_grade}</span>
                          <span className="text-sm text-gray-600">({group.new_grade_type})</span>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {group.student_count} öğrenci
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.students.slice(0, 6).map((student) => (
                        <div key={student.id} className="flex items-center space-x-2 text-sm">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{student.name}</span>
                        </div>
                      ))}
                      {group.students.length > 6 && (
                        <div className="text-sm text-gray-500">
                          +{group.students.length - 6} öğrenci daha
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
                </div>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={promoting}
                  className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {promoting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {promoting ? 'Yükseltiliyor...' : 'Sınıf Yükseltmeyi Başlat'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Promotion Results */}
        {promotionResults && (
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-green-100 p-6 mb-8">
            <div className="flex items-center mb-6">
              <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-green-900">Sınıf Yükseltme Tamamlandı</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-700">{promotionResults.promoted_count || 0}</div>
                <div className="text-sm text-green-600">Yükseltilen Öğrenci</div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{promotionResults.graduated_count || 0}</div>
                <div className="text-sm text-blue-600">Mezun Olan</div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-2xl font-bold text-orange-700">{promotionResults.new_year_created ? 'Evet' : 'Hayır'}</div>
                <div className="text-sm text-orange-600">Yeni Yıl Oluşturuldu</div>
              </div>
            </div>

            {promotionResults.target_year && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Hedef Eğitim Yılı:</h4>
                <p className="text-gray-700">{promotionResults.target_year.year}</p>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Sınıf Yükseltme Onayı</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  <strong>{getTotalStudents()}</strong> öğrencinin sınıf yükseltme işlemi gerçekleştirilecek.
                  Bu işlem geri alınamaz.
                </p>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800 font-medium">⚠️ DİKKAT:</p>
                  <p className="text-sm text-orange-700">
                    • Tüm öğrenciler bir üst sınıfa yükseltilecek
                    <br />• 12. sınıf öğrencileri mezun olacak
                    <br />• MESEM öğrencileri uygun sınıflara yönlendirilecek
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={promoting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={executePromotion}
                  disabled={promoting}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {promoting ? 'Yükseltiliyor...' : 'Onayla ve Yükselt'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-start">
            <GraduationCap className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-base font-semibold text-blue-900 mb-2">Sınıf Yükseltme Kuralları</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• <strong>Normal Öğrenciler:</strong> 9→10, 10→11, 11→12, 12→Mezun</p>
                <p>• <strong>MESEM Öğrencileri:</strong> 9→10, 10→11, 11→12, 12→Mezun</p>
                <p>• <strong>Özel Durumlar:</strong> Sistem otomatik olarak uygun sınıfları belirler</p>
                <p>• <strong>Yeni Eğitim Yılı:</strong> Gerekirse otomatik olarak oluşturulur</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}