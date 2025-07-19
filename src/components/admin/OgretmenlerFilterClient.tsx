'use client'

import { Filter } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Alan {
  id: number
  ad: string
}

interface Props {
  alanlar: Alan[]
  currentAlan?: string
  currentSearch?: string
  currentPerPage?: string
}

export default function OgretmenlerFilterClient({ alanlar, currentAlan, currentSearch, currentPerPage }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleAlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams)
    
    if (e.target.value === 'all') {
      params.delete('alan')
    } else {
      params.set('alan', e.target.value)
    }
    
    // Reset to first page when filtering
    params.delete('page')
    
    router.push(`/admin/ogretmenler?${params.toString()}`)
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtreler:</span>
        </div>

        {/* Alan Filter */}
        <select
          value={currentAlan || 'all'}
          onChange={handleAlanChange}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Tüm Alanlar</option>
          {alanlar.map((alan: Alan) => (
            <option key={alan.id} value={alan.id}>
              {alan.ad}
            </option>
          ))}
        </select>

        {/* Active filters display */}
        <div className="flex items-center gap-2">
          {currentSearch && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
              Arama: "{currentSearch}"
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams)
                  params.delete('search')
                  router.push(`/admin/ogretmenler?${params.toString()}`)
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {currentAlan && currentAlan !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
              Alan: {alanlar.find((a: Alan) => a.id.toString() === currentAlan)?.ad}
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams)
                  params.delete('alan')
                  router.push(`/admin/ogretmenler?${params.toString()}`)
                }}
                className="text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {/* Clear all filters */}
        {(currentSearch || (currentAlan && currentAlan !== 'all')) && (
          <button
            onClick={() => router.push('/admin/ogretmenler')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Tüm filtreleri temizle
          </button>
        )}
      </div>
    </div>
  )
}