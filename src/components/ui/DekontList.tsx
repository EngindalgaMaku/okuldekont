import { Download, Receipt } from 'lucide-react'
import { Dekont } from '@/types/dekont'

interface DekontListProps {
  dekontlar: Dekont[]
  onDekontSelect: (dekont: Dekont) => void
  onDekontDelete?: (dekont: Dekont) => void
  isLoading?: boolean
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount)
}

const getOnayDurumuClass = (durum: string) => {
  switch (durum) {
    case 'bekliyor':
      return 'bg-yellow-100 text-yellow-800'
    case 'onaylandi':
      return 'bg-green-100 text-green-800'
    case 'reddedildi':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getOnayDurumuText = (durum: string) => {
  switch (durum) {
    case 'bekliyor':
      return 'Bekliyor'
    case 'onaylandi':
      return 'Onaylandı'
    case 'reddedildi':
      return 'Reddedildi'
    default:
      return 'Bilinmiyor'
  }
}

const aylar: { [key: string]: string } = {
  '1': 'Ocak',
  '2': 'Şubat',
  '3': 'Mart',
  '4': 'Nisan',
  '5': 'Mayıs',
  '6': 'Haziran',
  '7': 'Temmuz',
  '8': 'Ağustos',
  '9': 'Eylül',
  '10': 'Ekim',
  '11': 'Kasım',
  '12': 'Aralık'
};

export default function DekontList({ dekontlar, onDekontSelect, onDekontDelete, isLoading }: DekontListProps) {
  if (isLoading) {
    return (
      <div className="w-full text-center py-16">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">Yükleniyor...</p>
      </div>
    )
  }

  if (dekontlar.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
          <Receipt className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Dekont Bulunamadı</h3>
        <p className="mt-2 text-sm text-gray-500">Henüz dekont yüklenmemiş.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        {dekontlar.map((dekont) => (
          <div 
            key={dekont.id} 
            className="bg-white mb-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
          >
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                {/* Sol Taraf - Öğrenci Bilgileri */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {dekont.stajlar?.ogrenciler?.ad} {dekont.stajlar?.ogrenciler?.soyad}
                    </h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getOnayDurumuClass(dekont.onay_durumu)}`}>
                      {getOnayDurumuText(dekont.onay_durumu)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-sm">
                    {dekont.stajlar?.ogrenciler?.no && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        No: {dekont.stajlar.ogrenciler.no}
                      </span>
                    )}
                    {dekont.stajlar?.ogrenciler?.sinif && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
                        {dekont.stajlar.ogrenciler.sinif}. Sınıf
                      </span>
                    )}
                    {dekont.stajlar?.ogrenciler?.alan?.ad && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-green-100 text-green-800">
                        {dekont.stajlar.ogrenciler.alan.ad}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sağ Taraf - Dekont Detayları ve Aksiyonlar */}
                <div className="flex flex-col sm:items-end justify-between gap-2">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{aylar[dekont.ay.toString()]} {dekont.yil}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {dekont.dosya_url && (
                      <button
                        onClick={() => onDekontSelect(dekont)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        İndir
                      </button>
                    )}
                    
                    {onDekontDelete && (
                      <button
                        onClick={() => onDekontDelete(dekont)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Ek Bilgiler */}
              {dekont.aciklama && (
                <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  {dekont.aciklama}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 