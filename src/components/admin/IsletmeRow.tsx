'use client'

import { useState, useEffect } from 'react'
import { Building, CheckSquare, Square } from 'lucide-react'
import Link from 'next/link'
import IsletmeQuickPinButton from './IsletmeQuickPinButton'
import IsletmePinDisplay from './IsletmePinDisplay'

interface Isletme {
  id: string
  ad: string
  adres?: string
  telefon?: string
  email?: string
  yetkili_kisi?: string
  pin?: string
  ogretmen_id?: string
  usta_ogretici_ad?: string
  usta_ogretici_telefon?: string
  ogretmenler?: {
    id: string
    ad: string
    soyad: string
    alanlar?: {
      ad: string
    } | {
      ad: string
    }[]
  } | null
  aktifOgrenciler?: {
    id: string
    ad: string
    soyad: string
    no: string
    sinif: string
  }[]
}

interface Props {
  isletme: Isletme
  isSelected: boolean
  onSelectionChange: (isletmeId: string, selected: boolean) => void
}

export default function IsletmeRow({ isletme, isSelected, onSelectionChange }: Props) {
  const handleCheckboxChange = () => {
    onSelectionChange(isletme.id, !isSelected)
  }

  return (
    <tr className="hover:bg-indigo-50/50 transition-colors duration-200">
      <td className="w-12 px-3 py-4">
        <div className="flex items-center justify-center">
          <button
            onClick={handleCheckboxChange}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
            <Building className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer truncate max-w-[200px]">
              <Link href={`/admin/isletmeler/${isletme.id}`}>
                {isletme.ad}
              </Link>
            </div>
            <div className="space-y-1 mt-1">
              {isletme.yetkili_kisi && (
                <div className="text-xs text-gray-500">
                  👤 {isletme.yetkili_kisi}
                </div>
              )}
              {isletme.telefon && (
                <div className="text-xs text-gray-600">
                  📞 {isletme.telefon}
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div>
          {isletme.usta_ogretici_ad ? (
            <div className="space-y-1">
              <div className="text-sm text-gray-900">
                {isletme.usta_ogretici_ad}
              </div>
              {isletme.usta_ogretici_telefon && (
                <div className="text-xs text-gray-600">
                  📞 {isletme.usta_ogretici_telefon}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              -
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div>
          {isletme.ogretmenler ? (
            <div>
              <div className="text-sm text-gray-900">
                {isletme.ogretmenler.ad} {isletme.ogretmenler.soyad}
              </div>
              {isletme.ogretmenler.alanlar && (
                <div className="text-xs text-gray-500">
                  {(isletme.ogretmenler.alanlar as any).ad}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              -
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div>
          {isletme.aktifOgrenciler && isletme.aktifOgrenciler.length > 0 ? (
            <div className="space-y-1">
              {isletme.aktifOgrenciler.slice(0, 3).map((ogrenci, index) => (
                <div key={index} className="text-xs text-gray-700">
                  {ogrenci.ad} {ogrenci.soyad} ({ogrenci.no})
                  <div className="text-xs text-gray-500">{ogrenci.sinif}</div>
                </div>
              ))}
              {isletme.aktifOgrenciler.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{isletme.aktifOgrenciler.length - 3} diğer
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Aktif öğrenci yok
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-center gap-2">
          {/* PIN görüntüleme butonu */}
          <IsletmePinDisplay
            isletmeId={isletme.id}
            isletmeAd={isletme.ad}
            pin={isletme.pin || ''}
          />
          {/* İşletme detay butonu */}
          <Link
            href={`/admin/isletmeler/${isletme.id}`}
            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="İşletme Detayı"
          >
            <Building className="h-4 w-4" />
          </Link>
        </div>
      </td>
    </tr>
  )
}