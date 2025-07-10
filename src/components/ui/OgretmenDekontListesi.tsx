'use client'

import { CheckCircle, XCircle, Clock, Download, User, Building2, Receipt } from 'lucide-react'

export interface DekontDetay {
  id: string;
  ay: number;
  yil: number;
  onay_durumu: 'onaylandi' | 'bekliyor' | 'reddedildi';
  ogrenci_ad_soyad: string;
  isletme_ad: string;
  dosya_url?: string; // Assuming dosya_url might be available
}

interface OgretmenDekontListesiProps {
  dekontlar: DekontDetay[];
}

const getStatusClass = (status: string) => {
    switch (status) {
      case 'onaylandi':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'reddedildi':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
}

const getStatusIcon = (status: string) => {
    switch (status) {
      case 'onaylandi':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'reddedildi':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
}

const getStatusText = (status: string) => {
    switch (status) {
      case 'onaylandi':
        return 'Onaylandı'
      case 'reddedildi':
        return 'Reddedildi'
      default:
        return 'Bekliyor'
    }
}

const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function OgretmenDekontListesi({ dekontlar }: OgretmenDekontListesiProps) {
  if (dekontlar.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Receipt className="mx-auto h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium">Dekont Bulunmuyor</h3>
        <p>Bu öğretmenin sorumlu olduğu öğrencilere ait dekont bulunmuyor.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öğrenci / İşletme</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dönem</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {dekontlar.map(dekont => (
            <tr key={dekont.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-900">{dekont.ogrenci_ad_soyad}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{dekont.isletme_ad}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {aylar[dekont.ay - 1]} {dekont.yil}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(dekont.onay_durumu)}`}>
                  {getStatusIcon(dekont.onay_durumu)}
                  <span className="ml-1">{getStatusText(dekont.onay_durumu)}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}