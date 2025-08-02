'use client'

import { useState } from 'react'
import { BrainCircuit, TestTube2, Wand2, Loader, FileImage, CheckCircle, XCircle, Percent } from 'lucide-react'

// Define types for clarity
type DekontData = {
  tutar: string
  tarih: string
  gonderen: string
  iban: string
  aciklama: string
}

type ZorlukAyarlari = {
  bulaniklik: number
  gurultu: number
  egiklik: number
  kontrast: number
}

type AnalizSonucu = {
  beklenen: DekontData
  tespitEdilen: Partial<DekontData>
  guvenilirlik: number
  basariOranlari: {
    tutar: number
    tarih: number
    gonderen: number
    iban: number
    aciklama: number
  }
  skorDetaylari: {
    ocrGuvenilirligi: number
    aiTutarliligi: number
    veriUyumu: number
    toplam: number
  }
  gorselUrl: string
}

export default function DekontTestToolPage() {
  const [dekontData, setDekontData] = useState<DekontData>({
    tutar: '350.75',
    tarih: '25.07.2025',
    gonderen: 'Ahmet Yılmaz',
    iban: 'TR330006100519786457841326',
    aciklama: 'Temmuz ayı staj ücreti',
  })

  const [zorluk, setZorluk] = useState<ZorlukAyarlari>({
    bulaniklik: 0,
    gurultu: 0,
    egiklik: 0,
    kontrast: 1,
  })

  const [loading, setLoading] = useState(false)
  const [sonuc, setSonuc] = useState<AnalizSonucu | null>(null)

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setDekontData((prev) => ({ ...prev, [name]: value }))
  }

  const handleZorlukChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setZorluk((prev) => ({ ...prev, [name]: parseFloat(value) }))
  }

  const handleTestRun = async () => {
    setLoading(true)
    setSonuc(null)
    try {
      const response = await fetch('/api/admin/dekont-test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dekontData, zorluk }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Test sırasında bir hata oluştu.')
      }

      const resultData = await response.json()
      setSonuc(resultData)
    } catch (error: any) {
      alert(`Hata: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <TestTube2 className="mx-auto h-12 w-12 text-indigo-600" />
        <h1 className="text-3xl font-bold mt-4">Dekont AI Test ve Simülasyon Aracı</h1>
        <p className="text-lg text-gray-600 mt-2">
          Yapay zeka modelinin dekont analizi performansını farklı senaryolarla test edin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ayarlar Paneli */}
        <div className="bg-white p-6 rounded-lg shadow-md border space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Wand2 className="text-purple-500" /> 1. Dekont Verilerini Girin
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {Object.keys(dekontData).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 capitalize">{key}</label>
                  <input
                    type="text"
                    name={key}
                    value={dekontData[key as keyof DekontData]}
                    onChange={handleDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BrainCircuit className="text-orange-500" /> 2. Zorluk Seviyesini Ayarlayın
            </h2>
            <div className="space-y-4 mt-4">
              {Object.keys(zorluk).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 capitalize">{key}</label>
                  <input
                    type="range"
                    name={key}
                    min={key === 'kontrast' ? 0.5 : 0}
                    max={key === 'kontrast' ? 1.5 : key === 'egiklik' ? 15 : 10}
                    step={key === 'kontrast' ? 0.1 : 1}
                    value={zorluk[key as keyof ZorlukAyarlari]}
                    onChange={handleZorlukChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleTestRun}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {loading ? <Loader className="animate-spin" /> : <TestTube2 />}
            {loading ? 'Test Ediliyor...' : 'Testi Başlat'}
          </button>
        </div>

        {/* Sonuçlar Paneli */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold text-center">Test Sonuçları</h2>
          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader className="animate-spin h-12 w-12 text-indigo-600" />
              <p className="mt-4 text-gray-600">Dekont oluşturuluyor ve analiz ediliyor...</p>
            </div>
          )}
          {sonuc && !loading && (
            <div className="space-y-6 mt-4">
              <div>
                <h3 className="font-semibold">Oluşturulan Dekont Görseli</h3>
                <img src={sonuc.gorselUrl} alt="Oluşturulan Dekont" className="mt-2 rounded-lg border shadow-sm w-full" />
              </div>
              <div className="space-y-4">
                <div>
                    <h3 className="font-semibold text-lg">Genel Güvenilirlik: {Math.round(sonuc.guvenilirlik * 100)}%</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-medium mb-2">Skor Detayları</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                        <div className="flex justify-between"><span>OCR Güvenilirliği (%30):</span> <span className="font-bold">{Math.round(sonuc.skorDetaylari.ocrGuvenilirligi * 100)}%</span></div>
                        <div className="flex justify-between"><span>AI İç Tutarlılığı (%30):</span> <span className="font-bold">{Math.round(sonuc.skorDetaylari.aiTutarliligi * 100)}%</span></div>
                        <div className="flex justify-between"><span>Veri Eşleşme Başarısı (%40):</span> <span className="font-bold">{Math.round(sonuc.skorDetaylari.veriUyumu * 100)}%</span></div>
                    </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2">Veri</th>
                      <th className="px-4 py-2">Beklenen Değer</th>
                      <th className="px-4 py-2">Tespit Edilen Değer</th>
                      <th className="px-4 py-2 text-center">Başarı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(sonuc.beklenen).map((key) => (
                      <tr key={key} className="border-b">
                        <td className="px-4 py-2 font-medium capitalize">{key}</td>
                        <td className="px-4 py-2">{sonuc.beklenen[key as keyof DekontData]}</td>
                        <td className="px-4 py-2">{sonuc.tespitEdilen[key as keyof DekontData] || 'Tespit Edilemedi'}</td>
                        <td className="px-4 py-2 text-center">
                          {sonuc.basariOranlari[key as keyof typeof sonuc.basariOranlari] === 1 ? (
                            <CheckCircle className="h-5 w-5 text-green-500 inline" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!sonuc && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileImage className="h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-600">Testi başlatmak için yandaki ayarları kullanın.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}