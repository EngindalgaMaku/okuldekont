'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
// Removed Supabase import - migrated to Prisma
import { useSession } from 'next-auth/react'
import { Info, Clock, Receipt, Settings, AlertTriangle, CheckCircle, User, Building2, Key, Shield, Edit3, Save, Eye, EyeOff, Trash2, Unlock, Mail, Phone } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import { toast } from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import KoordinatoerlukProgrami from '@/components/ui/KoordinatoerlukProgrami'
import OgretmenDekontListesi, { DekontDetay } from '@/components/ui/OgretmenDekontListesi'

// Type definitions
interface Ogretmen {
  id: string;
  ad: string;
  soyad: string;
  email: string | null;
  telefon: string | null;
}
interface Staj {
  id: string;
  baslangic_tarihi: string;
  ogrenciler: { id: string; ad: string; soyad: string; sinif: string; no: string } | null;
  isletmeler: { id: string; ad: string } | null;
  dekontlar: { id: string; ay: number; yil: number; onay_durumu: 'onaylandi' | 'bekliyor' | 'reddedildi' }[];
}
interface Program {
  id: string;
  isletme_id: string;
  gun: string;
  saat_araligi: string;
}
interface KoordinatoerlukOgrenci {
    id: string;
    ad: string;
    soyad: string;
    isletme_id: string;
}

interface Props {
  ogretmen: Ogretmen;
  initialStajlar: Staj[];
  initialProgram: Program[];
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function OgretmenDetayClient({
  ogretmen,
  initialStajlar,
  initialProgram,
  searchParams,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  
  const tabParam = searchParams?.tab
  const activeTab = Array.isArray(tabParam) ? tabParam[0] : tabParam || 'detaylar'
  const currentPage = Number(searchParams?.page) || 1

  const [stajlar] = useState(initialStajlar)
  
  const itemsPerPage = 10
  const totalPages = Math.ceil(stajlar.length / itemsPerPage)
  const paginatedStajlar = stajlar.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleTabChange = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`)
  }

  const refreshData = () => {
    router.refresh()
  }

  const tumDekontlar = useMemo(() => {
    const dekontList: DekontDetay[] = []
    stajlar.forEach(staj => {
        if (staj.ogrenciler && staj.isletmeler) {
            staj.dekontlar.forEach(dekont => {
                dekontList.push({
                    ...dekont,
                    ogrenci_ad_soyad: `${staj.ogrenciler!.ad} ${staj.ogrenciler!.soyad}`,
                    isletme_ad: staj.isletmeler!.ad
                })
            })
        }
    })
    return dekontList.sort((a, b) => b.yil - a.yil || b.ay - a.ay)
  }, [stajlar])

  const koordinatoerlukOgrenciler: KoordinatoerlukOgrenci[] = useMemo(() => 
    stajlar
      .filter(s => s.ogrenciler && s.isletmeler)
      .map(s => ({
        id: s.ogrenciler!.id,
        ad: s.ogrenciler!.ad,
        soyad: s.ogrenciler!.soyad,
        isletme_id: s.isletmeler!.id,
      })),
    [stajlar]
  );

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px px-6 space-x-6">
          <TabButton id="detaylar" label="Öğrenci Listesi" icon={User} activeTab={activeTab} onClick={handleTabChange} />
          <TabButton id="program" label="Haftalık Program" icon={Clock} activeTab={activeTab} onClick={handleTabChange} />
          <TabButton id="dekontlar" label="Dekontlar" icon={Receipt} activeTab={activeTab} onClick={handleTabChange} />
          <TabButton id="ayarlar" label="Ayarlar" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'detaylar' && (
          <OgrenciListesiTab
            stajlar={paginatedStajlar}
            totalPages={totalPages}
            currentPage={currentPage}
          />
        )}
        {activeTab === 'program' && (
            <KoordinatoerlukProgrami
                programlar={initialProgram}
                isletmeler={Array.from(new Map(stajlar.map(s => s.isletmeler).filter(Boolean).map(i => [i!.id, i!])).values())}
                ogrenciler={koordinatoerlukOgrenciler}
                onProgramEkle={async (yeni) => {
                    // Program functionality disabled during migration
                    toast.error('Program özelliği geçici olarak devre dışı.');
                }}
                onProgramSil={async (id) => {
                    // Program functionality disabled during migration
                    toast.error('Program özelliği geçici olarak devre dışı.');
                }}
            />
        )}
        {activeTab === 'dekontlar' && <OgretmenDekontListesi dekontlar={tumDekontlar} />}
        {activeTab === 'ayarlar' && <AyarlarTab ogretmen={ogretmen} onUpdate={refreshData} />}
      </div>
    </div>
  )
}

// --- Sub-Components ---

const TabButton = ({ id, label, icon: Icon, activeTab, onClick }: { id: string, label: string, icon: React.ElementType, activeTab: string, onClick: (id: string) => void }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm ${
        activeTab === id
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
)

const OgrenciListesiTab = ({ stajlar, totalPages, currentPage }: { stajlar: Staj[], totalPages: number, currentPage: number }) => {
  if (stajlar.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Info className="mx-auto h-10 w-10 mb-2" />
        Bu öğretmenin sorumlu olduğu aktif staj bulunmuyor.
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öğrenci</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşletme</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Staj Başlangıcı</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {stajlar.map(staj => (
            <tr key={staj.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{staj.ogrenciler?.ad} {staj.ogrenciler?.soyad}</div>
                <div className="text-sm text-gray-500">{staj.ogrenciler?.sinif}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Link href={`/admin/isletmeler/${staj.isletmeler?.id}`} className="text-blue-600 hover:underline">
                  {staj.isletmeler?.ad}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700">
                {new Date(staj.baslangic_tarihi).toLocaleDateString('tr-TR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </div>
  )
}

const AyarlarTab = ({ ogretmen, onUpdate }: { ogretmen: Ogretmen, onUpdate: () => void }) => {
    const [pinModalOpen, setPinModalOpen] = useState(false)
    const [editModeContact, setEditModeContact] = useState(false)
    const [pinForm, setPinForm] = useState({ pin: '', confirmPin: '' })
    const [showPin, setShowPin] = useState(false)
    const [contactForm, setContactForm] = useState({ email: ogretmen.email || '', telefon: ogretmen.telefon || '' })
    const [deleteModal, setDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [loading, setLoading] = useState(false)
    const [lockStatus, setLockStatus] = useState<any>(null)
    const [lockStatusLoading, setLockStatusLoading] = useState(false)
    const router = useRouter()

    // Update contact form when ogretmen data changes
    useEffect(() => {
        setContactForm({ email: ogretmen.email || '', telefon: ogretmen.telefon || '' })
    }, [ogretmen.email, ogretmen.telefon])

    const fetchLockStatus = async () => {
        setLockStatusLoading(true);
        // Since the lock system is being migrated, we'll disable this for now
        setLockStatus({ kilitli: false });
        setLockStatusLoading(false);
    };

    useEffect(() => {
        fetchLockStatus();
    }, []);

    const handlePinAta = async () => {
        if (!pinForm.pin || pinForm.pin.length !== 4 || pinForm.pin !== pinForm.confirmPin) {
            toast.error('PIN bilgileri geçersiz veya eşleşmiyor.');
            return;
        }
        setLoading(true);
        
        try {
            const response = await fetch(`/api/admin/teachers/${ogretmen.id}/pin`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pin: pinForm.pin }),
            });
            
            if (response.ok) {
                toast.success('PIN başarıyla atandı.');
                setPinModalOpen(false);
                setPinForm({ pin: '', confirmPin: '' });
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'PIN atanırken hata oluştu.');
            }
        } catch (error) {
            toast.error('PIN atanırken hata oluştu.');
        }
        setLoading(false);
    }

    const handleContactUpdate = async () => {
        setLoading(true);
        
        try {
            const response = await fetch(`/api/admin/teachers/${ogretmen.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: contactForm.email || null,
                    phone: contactForm.telefon || null
                }),
            });
            
            if (response.ok) {
                toast.success('İletişim bilgileri güncellendi.');
                setEditModeContact(false);
                onUpdate();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'İletişim bilgileri güncellenirken hata oluştu.');
            }
        } catch (error) {
            toast.error('İletişim bilgileri güncellenirken hata oluştu.');
        }
        setLoading(false);
    }

    const handleDeleteOgretmen = async () => {
        if (deleteConfirmText !== 'SİL') {
            toast.error('Onaylamak için "SİL" yazmalısınız.');
            return;
        }
        setLoading(true);
        
        try {
            const response = await fetch(`/api/admin/teachers/${ogretmen.id}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                toast.success('Öğretmen başarıyla silindi.');
                router.push('/admin/ogretmenler');
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Öğretmen silinirken bir hata oluştu.');
            }
        } catch (error) {
            toast.error('Öğretmen silinirken bir hata oluştu.');
        }
        setLoading(false);
    }

    const handleUnlockAccount = async () => {
        setLoading(true);
        // Unlock functionality disabled during migration
        toast.error('Kilit açma özelliği geçici olarak devre dışı.');
        setLoading(false);
    }

    return (
        <div className="space-y-8">
            <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">PIN Yönetimi</h3>
                <button onClick={() => setPinModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">PIN Ata/Değiştir</button>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">İletişim Bilgileri</h3>
                    {!editModeContact && (
                        <button onClick={() => setEditModeContact(true)} className="flex items-center text-sm text-blue-600 hover:underline">
                            <Edit3 className="h-4 w-4 mr-1" /> Düzenle
                        </button>
                    )}
                </div>
                {editModeContact ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">E-posta</label>
                            <input type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Telefon</label>
                            <input type="tel" value={contactForm.telefon} onChange={e => setContactForm({...contactForm, telefon: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditModeContact(false)} className="px-4 py-2 border rounded">İptal</button>
                            <button onClick={handleContactUpdate} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">Kaydet</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm text-gray-700"><span className="font-medium">E-posta:</span> {ogretmen.email || 'Belirtilmemiş'}</p>
                        <p className="text-sm text-gray-700"><span className="font-medium">Telefon:</span> {ogretmen.telefon || 'Belirtilmemiş'}</p>
                    </div>
                )}
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Hesap Güvenliği</h3>
                {lockStatusLoading ? <p>Yükleniyor...</p> : lockStatus && (
                    <div className="space-y-2">
                        <p className="text-sm"><span className="font-medium">Durum:</span> {lockStatus.kilitli ? <span className="text-red-600">Kilitli</span> : <span className="text-green-600">Aktif</span>}</p>
                        {lockStatus.kilitli && (
                            <>
                                <p className="text-sm"><span className="font-medium">Kilitlenme Tarihi:</span> {new Date(lockStatus.kilitlenme_tarihi).toLocaleString('tr-TR')}</p>
                                <button onClick={handleUnlockAccount} disabled={loading} className="px-4 py-2 bg-yellow-500 text-white rounded-lg mt-2">Kilidi Aç</button>
                            </>
                        )}
                    </div>
                )}
            </div>
            <div>
                <button onClick={() => setDeleteModal(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Öğretmeni Kalıcı Olarak Sil</button>
            </div>

            <Modal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} title="PIN Ata/Değiştir">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Yeni PIN (4 haneli)</label>
                        <input type="password" value={pinForm.pin} onChange={e => setPinForm({...pinForm, pin: e.target.value})} className="w-full p-2 border rounded" maxLength={4} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">PIN Tekrar</label>
                        <input type="password" value={pinForm.confirmPin} onChange={e => setPinForm({...pinForm, confirmPin: e.target.value})} className="w-full p-2 border rounded" maxLength={4} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setPinModalOpen(false)} className="px-4 py-2 border rounded">İptal</button>
                        <button onClick={handlePinAta} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">Ata</button>
                    </div>
                </div>
            </Modal>
            <ConfirmModal 
                isOpen={deleteModal} 
                onClose={() => setDeleteModal(false)} 
                onConfirm={handleDeleteOgretmen} 
                title="Öğretmeni Sil" 
                description={
                    <div>
                        <p>"{ogretmen.ad} {ogretmen.soyad}" adlı öğretmeni silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Onaylamak için "SİL" yazın:</label>
                            <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="w-full p-2 border rounded mt-1" />
                        </div>
                    </div>
                }
                confirmText="Sil"
                isLoading={loading}
            />
        </div>
    )
}