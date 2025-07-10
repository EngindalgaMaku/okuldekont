'use client'

import { useState } from 'react'
import { Plus, X, Building2, Trash2, User } from 'lucide-react'
import Modal from './Modal'

// --- Type Definitions ---
interface Program {
  id?: string
  isletme_id: string
  gun: string
  saat_araligi: string
}

interface Isletme {
  id: string
  ad: string
}

interface Ogrenci {
    id: string
    ad: string
    soyad: string
    isletme_id: string
}

interface KoordinatoerlukProgramiProps {
  programlar: Program[]
  isletmeler: Isletme[]
  ogrenciler: Ogrenci[]
  onProgramEkle: (yeniProgram: Omit<Program, 'id'>) => Promise<void>
  onProgramSil: (programId: string) => Promise<void>
}

// --- Constants ---
const dersSaatleri = Array.from({ length: 10 }, (_, i) => `${i + 1}. Ders`)
const gunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']

// --- Main Component ---
export default function KoordinatoerlukProgrami({
  programlar,
  isletmeler,
  ogrenciler,
  onProgramEkle,
  onProgramSil
}: KoordinatoerlukProgramiProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ gun: string; saat: string } | null>(null)
  const [selectedIsletme, setSelectedIsletme] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSlotClick = (gun: string, saat: string) => {
    if (programlar.some(p => p.gun === gun && p.saat_araligi === saat)) return
    setSelectedSlot({ gun, saat })
    setSelectedIsletme('')
    setModalOpen(true)
  }

  const handleModalSubmit = async () => {
    if (!selectedSlot || !selectedIsletme) return
    setLoading(true)
    await onProgramEkle({
      gun: selectedSlot.gun,
      saat_araligi: selectedSlot.saat,
      isletme_id: selectedIsletme
    })
    setLoading(false)
    setModalOpen(false)
  }

  const getProgramForSlot = (gun: string, saat: string) => {
    return programlar.find(p => p.gun === gun && p.saat_araligi === saat)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold mb-4">Haftalık Koordinatörlük Programı</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border border-gray-200 w-24">Dersler</th>
              {gunler.map(gun => (
                <th key={gun} className="p-2 border border-gray-200">{gun}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dersSaatleri.map(ders => (
              <tr key={ders}>
                <td className="p-2 border border-gray-200 text-center font-medium">{ders}</td>
                {gunler.map(gun => {
                  const program = getProgramForSlot(gun, ders)
                  const isletmedekiOgrenciler = program
                    ? ogrenciler.filter(o => o.isletme_id === program.isletme_id)
                    : []

                  return (
                    <td key={gun} className="p-1 border border-gray-200 align-top h-24">
                      {program ? (
                        <div className="bg-indigo-100 text-indigo-800 rounded-md p-1.5 h-full flex flex-col justify-between text-xs">
                          <div>
                            <div className="flex items-start font-semibold mb-1">
                              <Building2 className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                              <span className="break-words">
                                {isletmeler.find(i => i.id === program.isletme_id)?.ad || 'Bilinmeyen İşletme'}
                              </span>
                            </div>
                            <ul className="pl-2 space-y-0.5">
                                {isletmedekiOgrenciler.map(o => (
                                    <li key={o.id} className="flex items-center text-indigo-700">
                                        <User className="h-3 w-3 mr-1 flex-shrink-0" />
                                        <span>{o.ad} {o.soyad}</span>
                                    </li>
                                ))}
                            </ul>
                          </div>
                          <button
                            onClick={() => program.id && onProgramSil(program.id)}
                            className="self-end p-0.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-200 rounded-full"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSlotClick(gun, ders)}
                          className="w-full h-full flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="İşletme Ziyareti Ekle">
        <div className="space-y-4">
          <p>
            <span className="font-semibold">{selectedSlot?.gun}</span> günü,
            <span className="font-semibold"> {selectedSlot?.saat}</span> için işletme ziyareti ekle.
          </p>
          <div>
            <label htmlFor="isletme-select" className="block text-sm font-medium text-gray-700 mb-2">
              İşletme Seçin
            </label>
            <select
              id="isletme-select"
              value={selectedIsletme}
              onChange={(e) => setSelectedIsletme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- İşletme seçin --</option>
              {isletmeler.map(isletme => (
                <option key={isletme.id} value={isletme.id}>{isletme.ad}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              İptal
            </button>
            <button
              onClick={handleModalSubmit}
              disabled={!selectedIsletme || loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}