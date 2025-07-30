'use client'

import { memo } from 'react'
import { Building2, UserCheck, Calendar, GraduationCap, CheckCircle, X } from 'lucide-react'

interface StajCardProps {
  staj: {
    id: string
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TERMINATED'
    startDate: string
    endDate: string | null
    terminationDate: string | null
    student?: {
      id: string
      name: string
      surname: string
      number: string
      className: string
      alan?: {
        name: string
      } | null
    } | null
    company?: {
      id: string
      name: string
      contact: string
    } | null
    teacher?: {
      id: string
      name: string
      surname: string
    } | null
  }
  isExpired: boolean
  isVisible: boolean
  onTamamla: (stajId: string) => void
  onFesih: (staj: any) => void
  onKoordinatorDegistir: (staj: any) => void
}

const StajCard = memo(function StajCard({
  staj,
  isExpired,
  isVisible,
  onTamamla,
  onFesih,
  onKoordinatorDegistir
}: StajCardProps) {
  if (!isVisible) {
    return <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />
  }

  return (
    <div className={`border rounded-lg p-3 md:p-6 ${
      isExpired ? 'bg-orange-50 border-orange-200' :
      staj.status === 'ACTIVE' ? 'bg-green-50 border-green-200' :
      staj.status === 'TERMINATED' ? 'bg-red-50 border-red-200' :
      'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Sol taraf - Bilgiler */}
        <div className="flex-1 min-w-0">
          <div className="space-y-2">
            <div className="space-y-2">
              <h3 className="text-base md:text-lg font-medium text-gray-900 break-words">
                {staj.student?.name || 'Bilinmiyor'} {staj.student?.surname || ''}
              </h3>
              <div className="flex flex-wrap gap-2">
                {isExpired && staj.status === 'ACTIVE' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Süresi Geçmiş
                  </span>
                )}
                {staj.status === 'COMPLETED' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ Staj Tamamlandı
                  </span>
                )}
                {staj.status === 'TERMINATED' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ❌ Staj Feshedildi
                  </span>
                )}
                {staj.status === 'CANCELLED' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    ⏹️ Staj İptal Edildi
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs md:text-sm text-gray-600">
                <div className="flex items-center gap-1 mb-1">
                  <GraduationCap className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                  <span className="break-words">{staj.student?.className || 'Bilinmiyor'} - No: {staj.student?.number || 'Bilinmiyor'}</span>
                </div>
                <div className="pl-4 break-words">{staj.student?.alan?.name || 'Alan belirtilmemiş'}</div>
              </div>
              
              <div className="flex items-start gap-1 text-xs md:text-sm text-gray-600">
                <Building2 className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 mt-0.5" />
                <span className="break-words">{staj.company?.name || 'İşletme bilgisi yok'}</span>
              </div>
              
              <div className="flex items-start gap-1 text-xs md:text-sm text-gray-600">
                <UserCheck className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-medium">Koordinatör: </span>
                  {staj.teacher ? (
                    <span className="break-words">
                      {`${staj.teacher.name} ${staj.teacher.surname}`}
                      {staj.status === 'TERMINATED' && (
                        <span className="text-xs text-gray-500 ml-1">(Fesih zamanında)</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-orange-600 font-medium">Koordinatör Öğretmen atanmadı</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-1 text-xs md:text-sm text-gray-600">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 mt-0.5" />
                <span className="break-words leading-relaxed">
                  {staj.startDate ? new Date(staj.startDate).toLocaleDateString('tr-TR') : 'Tarih yok'} - {
                    staj.status === 'TERMINATED' && staj.terminationDate
                      ? new Date(staj.terminationDate).toLocaleDateString('tr-TR') + ' (Fesih)'
                      : staj.endDate
                        ? new Date(staj.endDate).toLocaleDateString('tr-TR')
                        : 'Devam ediyor'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sağ taraf - Action Buttons */}
        <div className="flex flex-col gap-2 md:min-w-[200px]">
          {staj.status === 'ACTIVE' && !isExpired && (
            <>
              {/* Tamamla Button */}
              <button
                onClick={() => onTamamla(staj.id)}
                className="flex items-center justify-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs md:text-sm w-full"
              >
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span>Tamamla</span>
              </button>
              
              {/* Fesih Et Button */}
              <button
                onClick={() => onFesih(staj)}
                className="flex items-center justify-center space-x-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-xs md:text-sm w-full"
              >
                <X className="h-3 w-3 md:h-4 md:w-4" />
                <span>Fesih Et</span>
              </button>
              
              {/* Koordinatör Değiştir Button */}
              <button
                onClick={() => onKoordinatorDegistir(staj)}
                className="flex items-center justify-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm w-full"
              >
                <UserCheck className="h-3 w-3 md:h-4 md:w-4" />
                <span>Koordinatör Değiştir</span>
              </button>
            </>
          )}
          
          {/* Sadece Tamamla butonu - süresi geçmiş aktif stajlar için */}
          {staj.status === 'ACTIVE' && isExpired && (
            <button
              onClick={() => onTamamla(staj.id)}
              className="flex items-center justify-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs md:text-sm w-full"
            >
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
              <span>Stajı Tamamla</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default StajCard