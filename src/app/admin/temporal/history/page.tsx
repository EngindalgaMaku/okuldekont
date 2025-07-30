'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Search, 
  Calendar, 
  Users, 
  Building, 
  Clock,
  Filter,
  Download,
  RefreshCw,
  Eye,
  History,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Mail,
  MapPin,
  Building2
} from 'lucide-react'
import Link from 'next/link'

export default function HistoryViewPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [searchType, setSearchType] = useState(searchParams.get('search') || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const searchTypes = [
    { value: 'all', label: 'Tümü', icon: Search },
    { value: 'teacher', label: 'Öğretmenler', icon: Users },
    { value: 'company', label: 'İşletmeler', icon: Building }
  ]

  const handleSearch = async () => {
    if (!selectedDate) {
      alert('Lütfen bir tarih seçin')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        type: searchType,
        query: searchQuery
      })

      const response = await fetch(`/api/admin/temporal/history?${params}`)
      if (!response.ok) throw new Error('Arama başarısız')
      
      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Geçmiş bilgi arama hatası:', error)
      alert('Arama sırasında bir hata oluştu')
    }
    setLoading(false)
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const exportResults = () => {
    if (results.length === 0) {
      alert('Dışa aktarılacak veri bulunamadı')
      return
    }

    const csvContent = results.map(item => {
      if (item.type === 'teacher') {
        return `"${item.type}","${item.name}","${item.phone || ''}","${item.email || ''}","${selectedDate}"`
      } else if (item.type === 'company') {
        return `"${item.type}","${item.name}","${item.phone || ''}","${item.address || ''}","${selectedDate}"`
      }
      return ''
    }).join('\n')

    const header = 'Tip,Ad,Telefon,Email/Adres,Tarih\n'
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `gecmis-bilgiler-${selectedDate}.csv`
    link.click()
  }

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
                Geçmiş Bilgi Görüntüleme
              </h1>
              <p className="text-gray-600 mt-2">Belirli bir tarihteki bilgileri sorgulayın</p>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6 mb-8">
          <div className="flex items-center mb-4">
            <History className="h-5 w-5 text-indigo-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Arama Kriterleri</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama Tipi</label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {searchTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sorgu Tarihi</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Search Query */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama Metni (İsteğe Bağlı)</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İsim, telefon veya email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Seçilen tarih: <strong>{selectedDate ? new Date(selectedDate).toLocaleDateString('tr-TR') : 'Tarih seçilmedi'}</strong>
            </div>
            
            <div className="flex space-x-3">
              {results.length > 0 && (
                <button
                  onClick={exportResults}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV İndir
                </button>
              )}
              
              <button
                onClick={handleSearch}
                disabled={loading || !selectedDate}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Aranıyor...' : 'Ara'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-indigo-600" />
                Bulunan Sonuçlar ({results.length})
              </h3>
              <div className="text-sm text-gray-600">
                Tarih: {new Date(selectedDate).toLocaleDateString('tr-TR')}
              </div>
            </div>

            <div className="space-y-4">
              {results.map((item, index) => (
                <div key={`${item.type}-${item.id || index}`} className="border border-gray-200 rounded-lg">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpanded(`${item.type}-${item.id || index}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${
                          item.type === 'teacher' ? 'bg-blue-100' : 
                          item.type === 'company' ? 'bg-orange-100' : 'bg-gray-100'
                        }`}>
                          {item.type === 'teacher' ? (
                            <Users className={`h-5 w-5 ${
                              item.type === 'teacher' ? 'text-blue-600' : 
                              item.type === 'company' ? 'text-orange-600' : 'text-gray-600'
                            }`} />
                          ) : (
                            <Building className={`h-5 w-5 ${
                              item.type === 'teacher' ? 'text-blue-600' : 
                              item.type === 'company' ? 'text-orange-600' : 'text-gray-600'
                            }`} />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">
                            {item.type === 'teacher' ? 'Öğretmen' : 'İşletme'}
                            {item.phone && ` • ${item.phone}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.type === 'teacher' ? 'bg-blue-100 text-blue-800' : 
                          item.type === 'company' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.type === 'teacher' ? 'Öğretmen' : 'İşletme'}
                        </span>
                        {expandedItems.has(`${item.type}-${item.id || index}`) ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedItems.has(`${item.type}-${item.id || index}`) && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {item.type === 'teacher' && (
                          <>
                            {item.email && (
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-700">{item.email}</span>
                              </div>
                            )}
                            {item.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-700">{item.phone}</span>
                              </div>
                            )}
                            {item.field && (
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-700">Alan: {item.field}</span>
                              </div>
                            )}
                          </>
                        )}

                        {item.type === 'company' && (
                          <>
                            {item.address && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-700">{item.address}</span>
                              </div>
                            )}
                            {item.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-700">{item.phone}</span>
                              </div>
                            )}
                            {item.master_teacher && (
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-700">Usta Öğretmen: {item.master_teacher}</span>
                              </div>
                            )}
                            {item.employee_count !== undefined && (
                              <div className="flex items-center space-x-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-700">Çalışan Sayısı: {item.employee_count}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {item.changes && item.changes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Değişiklik Geçmişi:</h5>
                          <div className="space-y-2">
                            {item.changes.slice(0, 3).map((change: any, changeIndex: number) => (
                              <div key={changeIndex} className="text-xs text-gray-600 bg-white p-2 rounded border">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{change.change_type}</span>
                                  <span>{new Date(change.valid_from).toLocaleDateString('tr-TR')}</span>
                                </div>
                                {change.description && (
                                  <p className="mt-1">{change.description}</p>
                                )}
                              </div>
                            ))}
                            {item.changes.length > 3 && (
                              <p className="text-xs text-gray-500">+ {item.changes.length - 3} değişiklik daha</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && selectedDate && !loading && (
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-gray-200 p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sonuç Bulunamadı</h3>
            <p className="text-gray-600">
              Seçilen tarih ({new Date(selectedDate).toLocaleDateString('tr-TR')}) için 
              {searchType !== 'all' && ` ${searchTypes.find(t => t.value === searchType)?.label.toLowerCase()}`} 
              {searchQuery && ` "${searchQuery}" araması ile`} eşleşen kayıt bulunamadı.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-start">
            <Calendar className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-base font-semibold text-blue-900 mb-2">Geçmiş Bilgi Sorgulama</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Herhangi bir tarihteki öğretmen ve işletme bilgilerini görüntüleyebilirsiniz</p>
                <p>• Sistem otomatik olarak o tarihteki geçerli bilgileri bulur</p>
                <p>• Sonuçları CSV formatında dışa aktarabilirsiniz</p>
                <p>• Detaylı bilgi için kayıtlara tıklayarak genişletebilirsiniz</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}