'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { Building2, UserCheck, Calendar, GraduationCap, CheckCircle, X, User, Clock, MapPin, Award, MoreVertical, Settings } from 'lucide-react'

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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!isVisible) {
    return <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded-2xl shadow-sm" />
  }

  // Status configuration
  const statusConfig = {
    ACTIVE: {
      gradient: isExpired ? 'from-orange-500 to-red-500' : 'from-emerald-500 to-teal-600',
      bg: isExpired ? 'bg-orange-50' : 'bg-emerald-50',
      border: isExpired ? 'border-orange-200' : 'border-emerald-200',
      badge: isExpired ? 'bg-orange-500' : 'bg-emerald-500',
      text: isExpired ? 'Süresi Geçmiş' : 'Aktif Staj',
      icon: isExpired ? '⚠️' : '🚀'
    },
    COMPLETED: {
      gradient: 'from-blue-500 to-purple-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badge: 'bg-blue-500',
      text: 'Tamamlandı',
      icon: '✅'
    },
    TERMINATED: {
      gradient: 'from-red-500 to-pink-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      badge: 'bg-red-500',
      text: 'Feshedildi',
      icon: '❌'
    },
    CANCELLED: {
      gradient: 'from-gray-500 to-slate-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      badge: 'bg-gray-500',
      text: 'İptal Edildi',
      icon: '⏹️'
    }
  }

  const status = statusConfig[staj.status]
  const studentName = staj.student ? `${staj.student.name} ${staj.student.surname}` : 'Bilinmiyor'
  const studentInitials = studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className={`group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${status.bg} ${status.border} border-2`}>
      {/* Gradient Header */}
      <div className={`h-2 bg-gradient-to-r ${status.gradient}`}></div>
      
      <div className="p-6">
        {/* Header with Avatar and Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Student Avatar */}
            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${status.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
              {studentInitials}
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {studentName}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <GraduationCap className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 font-medium">
                  {staj.student?.className} • No: {staj.student?.number}
                </span>
              </div>
            </div>
          </div>
          
          {/* Status Badge and Actions */}
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-white text-xs font-medium ${status.badge} shadow-sm flex items-center space-x-1`}>
              <span>{status.icon}</span>
              <span>{status.text}</span>
            </div>
            
            {/* Actions Dropdown */}
            {staj.status === 'ACTIVE' && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200 group"
                  title="İşlemler"
                >
                  <MoreVertical className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => {
                        onTamamla(staj.id)
                        setDropdownOpen(false)
                      }}
                      className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-sm font-medium"
                    >
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>Stajı Tamamla</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        onKoordinatorDegistir(staj)
                        setDropdownOpen(false)
                      }}
                      className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm font-medium"
                    >
                      <UserCheck className="h-4 w-4 text-blue-600" />
                      <span>Koordinatör Değiştir</span>
                    </button>
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    <button
                      onClick={() => {
                        onFesih(staj)
                        setDropdownOpen(false)
                      }}
                      className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-red-50 hover:text-red-700 transition-colors text-sm font-medium"
                    >
                      <X className="h-4 w-4 text-red-600" />
                      <span>Stajı Fesih Et</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="space-y-4">
          {/* Department/Field */}
          <div className="bg-white/70 rounded-xl p-3 border border-white/50">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">Alan</span>
            </div>
            <p className="text-gray-900 font-semibold mt-1">
              {staj.student?.alan?.name || 'Alan belirtilmemiş'}
            </p>
          </div>

          {/* Company */}
          <div className="bg-white/70 rounded-xl p-3 border border-white/50">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">İşletme</span>
            </div>
            <p className="text-gray-900 font-semibold mt-1 flex items-center">
              <MapPin className="h-3 w-3 text-gray-500 mr-1" />
              {staj.company?.name || 'İşletme bilgisi yok'}
            </p>
          </div>

          {/* Coordinator */}
          <div className="bg-white/70 rounded-xl p-3 border border-white/50">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Koordinatör</span>
            </div>
            <p className="text-gray-900 font-semibold mt-1">
              {staj.teacher ? (
                `${staj.teacher.name} ${staj.teacher.surname}`
              ) : (
                <span className="text-orange-600">Atanmamış</span>
              )}
            </p>
          </div>

          {/* Duration */}
          <div className="bg-white/70 rounded-xl p-3 border border-white/50">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Staj Süresi</span>
            </div>
            <p className="text-gray-900 font-semibold mt-1">
              {staj.startDate ? new Date(staj.startDate).toLocaleDateString('tr-TR') : 'Başlangıç yok'} 
              <span className="text-gray-500 mx-2">→</span>
              {staj.status === 'TERMINATED' && staj.terminationDate
                ? `${new Date(staj.terminationDate).toLocaleDateString('tr-TR')} (Fesih)`
                : staj.endDate
                  ? new Date(staj.endDate).toLocaleDateString('tr-TR')
                  : 'Devam ediyor'}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
})

export default StajCard