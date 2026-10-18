import { Users } from 'lucide-react'

export default function OgrencilerLoading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            <div className="h-6 sm:h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-6 w-24 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>

      {/* Filters skeleton */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-3">
          <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Table skeleton - Desktop */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 p-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border-b border-gray-100 p-6">
            <div className="grid grid-cols-4 gap-4 items-center">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
              </div>
              <div className="space-y-1">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
              </div>
              <div className="flex justify-end space-x-2">
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cards skeleton - Mobile */}
      <div className="lg:hidden space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="flex space-x-1">
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse"></div>
              <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}