'use client'

import { memo } from 'react'
import { GraduationCap } from 'lucide-react'

interface OgrenciCardProps {
  ogrenci: {
    id: string
    name: string
    surname: string
    number: string
    className: string
    alan?: {
      name: string
    } | null
  }
}

const OgrenciCard = memo(function OgrenciCard({ ogrenci }: OgrenciCardProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
      <div className="flex items-start">
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-medium text-gray-900">
            {ogrenci.name} {ogrenci.surname}
          </h3>
          <div className="text-xs md:text-sm text-gray-600 space-y-1">
            <div className="flex items-center">
              <GraduationCap className="h-3 w-3 md:h-4 md:w-4 mr-1 flex-shrink-0" />
              <span>{ogrenci.className} - No: {ogrenci.number}</span>
            </div>
            <div className="ml-4">{ogrenci.alan?.name || 'Alan belirtilmemiş'}</div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default OgrenciCard