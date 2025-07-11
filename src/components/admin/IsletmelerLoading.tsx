import { Building, Loader } from 'lucide-react'

export default function IsletmelerLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-[95%] mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              İşletme Yönetimi
            </h1>
            <p className="text-gray-600 mt-2">Staj yapacak işletmeleri yönetin ve bilgilerini güncelleyin.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 overflow-hidden">
          {/* Search and Filters Loading */}
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="w-full h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="w-16 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-24 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Stats Loading */}
          <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Table Loading */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    İşletme
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Koordinatör
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Aktif Öğrenciler
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    PIN
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Detay
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/60 divide-y divide-gray-200">
                {[...Array(10)].map((_, i) => (
                  <tr key={i} className="hover:bg-indigo-50/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse mr-3"></div>
                        <div>
                          <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                          <div className="space-y-1">
                            <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
                            <div className="w-28 h-3 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="w-28 h-3 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className="w-12 h-5 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Loading */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
              
              <div className="flex items-center space-x-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex justify-center items-center py-8">
          <Loader className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-gray-600">İşletmeler yükleniyor...</span>
        </div>
      </div>
    </div>
  )
}