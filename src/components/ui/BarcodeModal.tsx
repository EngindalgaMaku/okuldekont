'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Copy } from 'lucide-react'
import { toast } from 'react-hot-toast'
import JsBarcode from 'jsbarcode'
import Modal from './Modal'

interface BarcodeModalProps {
  isOpen: boolean
  onClose: () => void
  barcode: string
}

export default function BarcodeModal({ isOpen, onClose, barcode }: BarcodeModalProps) {
  const svgRef = useRef<HTMLDivElement>(null)
  const [barcodeReady, setBarcodeReady] = useState(false)

  // CSS ile basit barkod oluşturma fonksiyonu
  const generateCSSBarcode = (text: string) => {
    const bars = [];
    // Her karakteri bir dizi çizgiye çevir
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      // Karakter koduna göre çizgi kalınlıkları
      const pattern = char % 5;
      for (let j = 0; j < 8; j++) {
        const width = (pattern + j) % 3 + 1;
        bars.push(width);
      }
    }
    return bars;
  };

  useEffect(() => {
    if (isOpen && barcode) {
      setBarcodeReady(false);
      setTimeout(() => {
        setBarcodeReady(true);
      }, 100);
    }
  }, [isOpen, barcode])

  const barcodePattern = barcode ? generateCSSBarcode(barcode) : [];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(barcode)
      toast.success('Barkod kopyalandı!')
    } catch (error) {
      toast.error('Kopyalama başarısız')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Barkod Bilgileri">
      <div className="space-y-6">
        {/* Barkod Görseli */}
        <div className="flex justify-center">
          <div className="bg-white p-4 border border-gray-300 rounded-lg">
            {barcodeReady ? (
              <div className="flex flex-col items-center">
                {/* CSS Barkod Çizgileri */}
                <div className="flex items-end justify-center gap-px bg-white p-2 mb-2" style={{ height: '70px' }}>
                  {barcodePattern.map((width, index) => (
                    <div
                      key={index}
                      className="bg-black"
                      style={{
                        width: `${width * 2}px`,
                        height: '60px'
                      }}
                    />
                  ))}
                </div>
                {/* Barkod Metni */}
                <div className="text-sm font-mono text-center tracking-wider">{barcode}</div>
              </div>
            ) : (
              <div className="w-[350px] h-[100px] bg-gray-100 flex items-center justify-center text-gray-500">
                Barkod yükleniyor...
              </div>
            )}
          </div>
        </div>

        {/* Barkod Kodu */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barkod Kodu
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={barcode}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
              title="Kopyala"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bilgi Notu */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Not:</strong> Bu barkod görev belgesi için benzersiz tanımlayıcıdır. 
            Yazdırılan belgelerde de bu barkod görünecektir.
          </p>
        </div>

        {/* Kapatma Butonu */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </Modal>
  )
}