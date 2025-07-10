'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Folder, File, User, Building, Calendar, Download, Loader } from 'lucide-react'

interface DekontIndirModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (folderStructure: string, zipName: string) => void
  isLoading: boolean
  dekontSayisi: number
}

export default function DekontIndirModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  dekontSayisi,
}: DekontIndirModalProps) {
  const [folderStructure, setFolderStructure] = useState('{alan}/{ogrenci_ad_soyad}')
  const [zipName, setZipName] = useState('dekontlar')

  const handleConfirm = () => {
    onConfirm(folderStructure, zipName)
  }

  const placeholders = [
    { name: '{alan}', desc: 'Öğrencinin Alanı' },
    { name: '{ogretmen_ad_soyad}', desc: 'Sorumlu Öğretmen' },
    { name: '{isletme_ad}', desc: 'İşletme Adı' },
    { name: '{ogrenci_ad_soyad}', desc: 'Öğrenci Adı Soyadı' },
    { name: '{yil}', desc: 'Dekont Yılı' },
    { name: '{ay}', desc: 'Dekont Ayı' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dekontları Toplu İndir">
      <div className="space-y-6">
        <p className="text-gray-600">
          <span className="font-bold text-indigo-600">{dekontSayisi}</span> adet dekont indirilecek. Lütfen indirme seçeneklerini yapılandırın.
        </p>

        <div>
          <label htmlFor="zipName" className="block text-sm font-medium text-gray-700 mb-2">
            ZIP Dosyası Adı
          </label>
          <div className="relative">
            <File className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="zipName"
              value={zipName}
              onChange={(e) => setZipName(e.target.value)}
              className="pl-10 pr-4 py-2 block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="örn: 2025_ocak_dekontlari"
            />
             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">.zip</span>
          </div>
        </div>

        <div>
          <label htmlFor="folderStructure" className="block text-sm font-medium text-gray-700 mb-2">
            Klasör Yapısı Şablonu
          </label>
          <div className="relative">
            <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="folderStructure"
              value={folderStructure}
              onChange={(e) => setFolderStructure(e.target.value)}
              className="pl-10 pr-4 py-2 block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Dosyaların ZIP içinde nasıl klasörleneceğini belirleyin. Örneğin: {'{alan}/{ogretmen_ad_soyad}'}
          </p>
        </div>

        <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Kullanılabilir Değişkenler:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
                {placeholders.map(p => (
                    <div key={p.name} className="bg-gray-100 p-2 rounded-md">
                        <code className="font-mono text-indigo-600">{p.name}</code>
                        <p className="text-gray-600">{p.desc}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin h-4 w-4 mr-2" />
                İndiriliyor...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                İndirmeyi Başlat
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}