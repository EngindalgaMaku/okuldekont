'use client'

import { memo } from 'react'
import { Search, X } from 'lucide-react'

interface FilterSectionProps {
  activeTab: string
  searchTerm: string
  setSearchTerm: (value: string) => void
  filterAlan: string
  setFilterAlan: (value: string) => void
  filterSinif: string
  setFilterSinif: (value: string) => void
  filterIsletme: string
  setFilterIsletme: (value: string) => void
  filterOgretmen: string
  setFilterOgretmen: (value: string) => void
  filterEgitimYili: string
  setFilterEgitimYili: (value: string) => void
  uniqueAlanlar: Array<{ id: string; name: string }>
  uniqueClassNames: string[]
  uniqueIsletmeler: Array<{ id: string; name: string }>
  uniqueOgretmenler: Array<{ id: string; name: string; surname: string }>
  uniqueEgitimYillari: Array<{ id: string; year: string; active: boolean; archived?: boolean }>
  onClearAllFilters: () => void
}

const FilterSection = memo(function FilterSection({
  activeTab,
  searchTerm,
  setSearchTerm,
  filterAlan,
  setFilterAlan,
  filterSinif,
  setFilterSinif,
  filterIsletme,
  setFilterIsletme,
  filterOgretmen,
  setFilterOgretmen,
  filterEgitimYili,
  setFilterEgitimYili,
  uniqueAlanlar,
  uniqueClassNames,
  uniqueIsletmeler,
  uniqueOgretmenler,
  uniqueEgitimYillari,
  onClearAllFilters
}: FilterSectionProps) {
  const hasActiveFilters = searchTerm || filterAlan || filterSinif || filterIsletme || filterOgretmen || filterEgitimYili

  return (
    <div className="p-6 border-b border-gray-200">
      <div className="space-y-4">
        {/* Arama */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'bost' ? 'Öğrenci ara...' :
                'Öğrenci veya işletme ara...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* Filtreler */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Alan Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alan
              </label>
              <select
                value={filterAlan}
                onChange={(e) => setFilterAlan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Tüm Alanlar</option>
                {uniqueAlanlar.map((alan) => (
                  <option key={alan.id} value={alan.id}>
                    {alan.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sınıf Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sınıf
              </label>
              <select
                value={filterSinif}
                onChange={(e) => setFilterSinif(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Tüm Sınıflar</option>
                {uniqueClassNames.map((sinif) => (
                  <option key={sinif} value={sinif}>
                    {sinif}
                  </option>
                ))}
              </select>
            </div>

            {/* Eğitim Yılı Filtresi - Sadece stajlar için */}
            {activeTab !== 'bost' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Eğitim Yılı
                </label>
                <select
                  value={filterEgitimYili}
                  onChange={(e) => setFilterEgitimYili(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Tüm Dönemler</option>
                  {uniqueEgitimYillari
                    .filter((yil) => !yil.archived) // Arşivlenen dönemleri gizle
                    .map((yil) => (
                      <option key={yil.id} value={yil.id}>
                        {yil.year} {yil.active ? '(Aktif)' : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* İşletme ve Öğretmen Filtreleri - Sadece stajlar için */}
          {activeTab !== 'bost' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* İşletme Filtresi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İşletme
                </label>
                <select
                  value={filterIsletme}
                  onChange={(e) => setFilterIsletme(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Tüm İşletmeler</option>
                  {uniqueIsletmeler.map((isletme) => (
                    <option key={isletme.id} value={isletme.id}>
                      {isletme.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Öğretmen Filtresi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Koordinatör
                </label>
                <select
                  value={filterOgretmen}
                  onChange={(e) => setFilterOgretmen(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Tüm Koordinatörler</option>
                  {uniqueOgretmenler.map((ogretmen) => (
                    <option key={ogretmen.id} value={ogretmen.id}>
                      {ogretmen.name} {ogretmen.surname}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Aktif filtreleri temizle */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Aktif filtreler:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  Arama: {searchTerm}
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filterAlan && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  Alan: {uniqueAlanlar.find(a => a.id === filterAlan)?.name}
                  <button
                    onClick={() => setFilterAlan('')}
                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filterSinif && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  Sınıf: {filterSinif}
                  <button
                    onClick={() => setFilterSinif('')}
                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filterIsletme && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  İşletme: {uniqueIsletmeler.find(i => i.id === filterIsletme)?.name}
                  <button
                    onClick={() => setFilterIsletme('')}
                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filterOgretmen && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  Koordinatör: {uniqueOgretmenler.find(o => o.id === filterOgretmen)?.name} {uniqueOgretmenler.find(o => o.id === filterOgretmen)?.surname}
                  <button
                    onClick={() => setFilterOgretmen('')}
                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filterEgitimYili && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  Dönem: {uniqueEgitimYillari.find(y => y.id === filterEgitimYili)?.year}
                  <button
                    onClick={() => setFilterEgitimYili('')}
                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={onClearAllFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Tüm Filtreleri Temizle
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

export default FilterSection