import { Users, Loader } from 'lucide-react'

export default function OgretmenlerLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            Öğretmen Yönetimi
          </h1>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
            <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-64 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Öğretmen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alan
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PIN
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(10)].map((_, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-center">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-12 h-6 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center items-center py-8">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Öğretmenler yükleniyor...</span>
      </div>
    </div>
  )
}