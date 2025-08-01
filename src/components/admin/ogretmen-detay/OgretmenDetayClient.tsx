'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
// Removed Supabase import - migrated to Prisma
import { useSession } from 'next-auth/react'
import { Info, Clock, Receipt, Settings, AlertTriangle, CheckCircle, User, Building2, Key, Shield, Edit3, Save, Eye, EyeOff, Trash2, Unlock, Mail, Phone, ChevronDown, ChevronUp } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import { toast } from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import KoordinatoerlukProgrami from '@/components/ui/KoordinatoerlukProgrami'
import OgretmenDekontListesi, { DekontDetay } from '@/components/ui/OgretmenDekontListesi'
// Remove pin-security import since we'll use API endpoints

// Type definitions
interface Ogretmen {
  id: string;
  ad: string;
  soyad: string;
  email: string | null;
  telefon: string | null;
  aktif?: boolean;
  pin?: string;
}
interface Staj {
  id: string;
  baslangic_tarihi: string;
  bitis_tarihi?: string;
  fesih_tarihi?: string;
  durum: string;
  koordinator_degisen?: boolean;
  ogrenciler: {
    id: string;
    ad: string;
    soyad: string;
    sinif: string;
    no: string;
    alan?: { id: string; ad: string } | null;
  } | null;
  isletmeler: {
    id: string;
    ad: string;
    yetkili?: string;
    telefon?: string;
    email?: string;
    usta_ogretici_ad?: string;
    usta_ogretici_telefon?: string;
  } | null;
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
                    ogrenci_sinif: staj.ogrenciler!.sinif,
                    ogrenci_no: staj.ogrenciler!.no,
                    ogrenci_alan: staj.ogrenciler!.alan?.ad,
                    isletme_ad: staj.isletmeler!.ad,
                    isletme_yetkili: staj.isletmeler!.yetkili,
                    isletme_telefon: staj.isletmeler!.telefon,
                    isletme_email: staj.isletmeler!.email
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
    <div className="bg-white rounded-lg shadow-md border border-gray-200 w-full max-w-none">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px px-0 space-x-6">
          <TabButton id="detaylar" label="Öğrenci Listesi" icon={User} activeTab={activeTab} onClick={handleTabChange} />
          <TabButton id="program" label="Haftalık Program" icon={Clock} activeTab={activeTab} onClick={handleTabChange} />
          <TabButton id="dekontlar" label="Dekontlar" icon={Receipt} activeTab={activeTab} onClick={handleTabChange} />
          <TabButton id="ayarlar" label="Temel Bilgiler" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
        </nav>
      </div>

      <div className="p-0">
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
                    try {
                        const response = await fetch(`/api/admin/teachers/${ogretmen.id}/program`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(yeni),
                        });

                        if (response.ok) {
                            toast.success('Program başarıyla eklendi.');
                            refreshData();
                        } else {
                            const errorData = await response.json();
                            toast.error(errorData.error || 'Program eklenirken hata oluştu.');
                        }
                    } catch (error) {
                        toast.error('Program eklenirken hata oluştu.');
                    }
                }}
                onProgramSil={async (id) => {
                    try {
                        const response = await fetch(`/api/admin/teachers/${ogretmen.id}/program/${id}`, {
                            method: 'DELETE',
                        });

                        if (response.ok) {
                            toast.success('Program başarıyla silindi.');
                            refreshData();
                        } else {
                            const errorData = await response.json();
                            toast.error(errorData.error || 'Program silinirken hata oluştu.');
                        }
                    } catch (error) {
                        toast.error('Program silinirken hata oluştu.');
                    }
                }}
            />
        )}
        {activeTab === 'dekontlar' && <OgretmenDekontListesi dekontlar={tumDekontlar} onUpdate={refreshData} />}
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
  const [filters, setFilters] = useState({
    aktif: true,
    tamamlanan: false,
    fesih: false,
    koordinator_degisen: false
  })

  const handleFilterChange = (filterName: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: checked
    }))
  }

  // Filter stajlar based on selected filters
  const filteredStajlar = stajlar.filter(staj => {
    if (filters.aktif && staj.durum === 'ACTIVE') return true
    if (filters.tamamlanan && staj.durum === 'COMPLETED') return true
    if (filters.fesih && staj.durum === 'TERMINATED') return true
    if (filters.koordinator_degisen && staj.koordinator_degisen) return true
    return false
  })

  if (stajlar.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Info className="mx-auto h-10 w-10 mb-2" />
        Bu öğretmenin sorumlu olduğu staj bulunmuyor.
      </div>
    )
  }

  if (filteredStajlar.length === 0) {
    return (
      <div>
        {/* Filter Controls */}
        <div className="mb-4 flex justify-end mt-2 mr-2">
          <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg border">
            <span className="text-sm font-medium text-gray-700">Filtreler:</span>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.aktif}
                onChange={(e) => handleFilterChange('aktif', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Aktif</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.tamamlanan}
                onChange={(e) => handleFilterChange('tamamlanan', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Tamamlanan</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.fesih}
                onChange={(e) => handleFilterChange('fesih', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Fesih Olan</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.koordinator_degisen}
                onChange={(e) => handleFilterChange('koordinator_degisen', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Koordinatörü Değişen</span>
            </label>
          </div>
        </div>

        <div className="text-center py-12 text-gray-500">
          <Info className="mx-auto h-10 w-10 mb-2" />
          Seçili filtrelere uygun staj bulunmuyor.
        </div>
      </div>
    )
  }
  return (
    <div>
      {/* Filter Controls */}
      <div className="mb-4 flex justify-end mt-2 mr-2">
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
          <span className="text-sm font-medium text-gray-700">Filtreler:</span>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.aktif}
              onChange={(e) => handleFilterChange('aktif', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Aktif ({stajlar.filter(s => s.durum === 'ACTIVE').length})</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.tamamlanan}
              onChange={(e) => handleFilterChange('tamamlanan', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Tamamlanan ({stajlar.filter(s => s.durum === 'COMPLETED').length})</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.fesih}
              onChange={(e) => handleFilterChange('fesih', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Fesih Olan ({stajlar.filter(s => s.durum === 'TERMINATED').length})</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.koordinator_degisen}
              onChange={(e) => handleFilterChange('koordinator_degisen', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Koordinatörü Değişen ({stajlar.filter(s => s.koordinator_degisen).length})</span>
          </label>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-2 sm:px-8">
        <table className="w-full table-auto rounded-xl shadow-lg border border-gray-200 bg-white">
          <thead>
            <tr className="bg-gradient-to-r from-blue-50 to-gray-100">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tl-xl">Öğrenci Bilgileri</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">İşletme & İletişim</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">Tarihler</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider rounded-tr-xl">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStajlar.map(staj => (
              <tr key={staj.id} className="hover:bg-blue-50 transition-colors group">
                <td className="px-6 py-5 align-top">
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-900 text-base">{staj.ogrenciler?.ad} {staj.ogrenciler?.soyad}</div>
                    {staj.ogrenciler?.no && (
                      <div className="text-xs text-gray-500">No: {staj.ogrenciler.no}</div>
                    )}
                    <div className="text-sm text-gray-600">{staj.ogrenciler?.sinif}</div>
                    {staj.ogrenciler?.alan && (
                      <div className="text-xs text-blue-700 font-medium">{staj.ogrenciler.alan.ad}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 align-top">
                  <div className="space-y-1">
                    <Link href={`/admin/isletmeler/${staj.isletmeler?.id}`} className="text-blue-700 hover:underline font-semibold">
                      {staj.isletmeler?.ad}
                    </Link>
                    {staj.isletmeler?.yetkili && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Yetkili: </span>
                        {staj.isletmeler.yetkili}
                      </div>
                    )}
                    {staj.isletmeler?.telefon && (
                      <div className="text-xs text-blue-700">
                        <a href={`tel:${staj.isletmeler.telefon}`} className="hover:underline">
                          {staj.isletmeler.telefon}
                        </a>
                      </div>
                    )}
                    {staj.isletmeler?.usta_ogretici_ad && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Usta Öğretici: </span>
                        {staj.isletmeler.usta_ogretici_ad}
                      </div>
                    )}
                    {staj.isletmeler?.usta_ogretici_telefon && (
                      <div className="text-xs text-blue-700">
                        <a href={`tel:${staj.isletmeler.usta_ogretici_telefon}`} className="hover:underline">
                          {staj.isletmeler.usta_ogretici_telefon}
                        </a>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 text-center align-top">
                  <div className="text-base text-gray-700 font-medium">
                    {new Date(staj.baslangic_tarihi).toLocaleDateString('tr-TR')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {staj.durum === 'TERMINATED' && staj.fesih_tarihi ? (
                      <span className="text-red-600 font-semibold">
                        Fesih: {new Date(staj.fesih_tarihi).toLocaleDateString('tr-TR')}
                      </span>
                    ) : staj.bitis_tarihi ? (
                      <span>
                        Bitiş: {new Date(staj.bitis_tarihi).toLocaleDateString('tr-TR')}
                      </span>
                    ) : (
                      <span className="text-green-600 font-semibold">Devam ediyor</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 text-center align-top">
                  <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full shadow-sm border border-gray-200 ${
                    staj.durum === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    staj.durum === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    staj.durum === 'TERMINATED' ? 'bg-red-100 text-red-800' :
                    staj.durum === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {staj.durum === 'ACTIVE' ? 'Aktif' :
                     staj.durum === 'COMPLETED' ? 'Tamamlandı' :
                     staj.durum === 'TERMINATED' ? 'Fesih' :
                     staj.durum === 'CANCELLED' ? 'İptal' :
                     staj.durum}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStajlar.length > 0 && (
          <div className="mt-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          </div>
        )}
      </div>
    </div>
  )
}

const AyarlarTab = ({ ogretmen, onUpdate }: { ogretmen: Ogretmen, onUpdate: () => void }) => {
    const [pinModalOpen, setPinModalOpen] = useState(false)
    const [editModeContact, setEditModeContact] = useState(false)
    const [editModeBasicInfo, setEditModeBasicInfo] = useState(false)
    const [pinForm, setPinForm] = useState({ pin: '', confirmPin: '' })
    const [showPin, setShowPin] = useState(false)
    const [contactForm, setContactForm] = useState({ email: ogretmen.email || '', telefon: ogretmen.telefon || '' })
    const [basicInfoForm, setBasicInfoForm] = useState({ ad: ogretmen.ad, soyad: ogretmen.soyad })
    const [deleteModal, setDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [loading, setLoading] = useState(false)
    const [lockStatus, setLockStatus] = useState<any>(null)
    const [lockStatusLoading, setLockStatusLoading] = useState(false)
    const [currentPin, setCurrentPin] = useState('')
    
    // Accordion state management - all sections start closed
    const [sectionsOpen, setSectionsOpen] = useState({
        basicInfo: false,
        accountManagement: false,
        contactInfo: false,
        accountSecurity: false
    })
    
    const router = useRouter()

    const toggleSection = (section: keyof typeof sectionsOpen) => {
        setSectionsOpen(prev => ({
            ...prev,
            [section]: !prev[section]
        }))
    }

    // Update forms when ogretmen data changes
    useEffect(() => {
        setContactForm({ email: ogretmen.email || '', telefon: ogretmen.telefon || '' })
        setBasicInfoForm({ ad: ogretmen.ad, soyad: ogretmen.soyad })
    }, [ogretmen.email, ogretmen.telefon, ogretmen.ad, ogretmen.soyad])

    const fetchLockStatus = async () => {
        setLockStatusLoading(true);
        try {
            // Security status kontrolü devre dışı bırakıldı
            const response = { ok: false }; // Dummy response
            
            // Security status kontrolü devre dışı - varsayılan değer
            setLockStatus({
                isLocked: false,
                remainingAttempts: 4,
                canAttempt: true
            });
        } catch (error) {
            console.error('Lock status fetch error:', error);
            setLockStatus({
                isLocked: false,
                remainingAttempts: 4,
                canAttempt: true
            });
        }
        setLockStatusLoading(false);
    };

    useEffect(() => {
        fetchLockStatus();
        fetchCurrentPin();
    }, []);

    const fetchCurrentPin = async () => {
        try {
            const response = await fetch(`/api/admin/teachers/${ogretmen.id}`);
            if (response.ok) {
                const data = await response.json();
                setCurrentPin(data.pin || '');
            }
        } catch (error) {
            console.error('PIN fetch error:', error);
        }
    };

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
                await fetchCurrentPin(); // PIN'i yeniden yükle
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

    const handleBasicInfoUpdate = async () => {
        if (!basicInfoForm.ad.trim() || !basicInfoForm.soyad.trim()) {
            toast.error('Ad ve soyad boş olamaz.');
            return;
        }

        setLoading(true);
        
        try {
            const response = await fetch(`/api/admin/teachers/${ogretmen.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: basicInfoForm.ad.trim(),
                    surname: basicInfoForm.soyad.trim()
                }),
            });
            
            if (response.ok) {
                toast.success('Ad ve soyad güncellendi.');
                setEditModeBasicInfo(false);
                onUpdate();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Ad ve soyad güncellenirken hata oluştu.');
            }
        } catch (error) {
            toast.error('Ad ve soyad güncellenirken hata oluştu.');
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
        try {
            const response = await fetch('/api/admin/security/unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entityType: 'teacher', entityId: ogretmen.id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Hesap kilidi açılırken hata oluştu');
            }

            toast.success('Hesap kilidi başarıyla açıldı.');
            await fetchLockStatus(); // Refresh lock status
        } catch (error: any) {
            toast.error(error.message || 'Hesap kilidi açılırken hata oluştu.');
        }
        setLoading(false);
    }

    return (
        <div className="space-y-4">
            {/* Temel Bilgiler Section */}
            <div className="bg-gray-50 rounded-lg border border-gray-200">
                <button
                    onClick={() => toggleSection('basicInfo')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 transition-colors"
                >
                    <h3 className="text-lg font-medium text-gray-900">Temel Bilgiler</h3>
                    {sectionsOpen.basicInfo ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                </button>
                {sectionsOpen.basicInfo && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            {!editModeBasicInfo && (
                                <button onClick={() => setEditModeBasicInfo(true)} className="flex items-center text-sm text-blue-600 hover:underline ml-auto">
                                    <Edit3 className="h-4 w-4 mr-1" /> Düzenle
                                </button>
                            )}
                        </div>
                        {editModeBasicInfo ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ad</label>
                                    <input
                                        type="text"
                                        value={basicInfoForm.ad}
                                        onChange={e => setBasicInfoForm({...basicInfoForm, ad: e.target.value})}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Soyad</label>
                                    <input
                                        type="text"
                                        value={basicInfoForm.soyad}
                                        onChange={e => setBasicInfoForm({...basicInfoForm, soyad: e.target.value})}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setEditModeBasicInfo(false)}
                                        className="px-4 py-2 border rounded"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={handleBasicInfoUpdate}
                                        disabled={loading}
                                        className="px-4 py-2 bg-green-600 text-white rounded"
                                    >
                                        Kaydet
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-gray-700"><span className="font-medium">Ad:</span> {ogretmen.ad}</p>
                                <p className="text-sm text-gray-700"><span className="font-medium">Soyad:</span> {ogretmen.soyad}</p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Durum:</span>
                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                        (ogretmen.aktif ?? true)
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {(ogretmen.aktif ?? true) ? 'Aktif' : 'Pasif'}
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hesap Yönetimi Section */}
            <div className="bg-gray-50 rounded-lg border border-gray-200">
                <button
                    onClick={() => toggleSection('accountManagement')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 transition-colors"
                >
                    <h3 className="text-lg font-medium text-gray-900">Hesap Yönetimi</h3>
                    {sectionsOpen.accountManagement ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                </button>
                {sectionsOpen.accountManagement && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                        <div className="mt-4 space-y-3">
                            {currentPin && (
                                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg border">
                                    <Key className="h-5 w-5 text-gray-600" />
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-gray-700">Mevcut PIN:</span>
                                        <span className="ml-2 font-mono text-lg text-gray-900">{currentPin}</span>
                                    </div>
                                    <button
                                        onClick={() => setPinModalOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                                    >
                                        <Key className="h-4 w-4" />
                                        Değiştir
                                    </button>
                                </div>
                            )}
                            {!currentPin && (
                                <button
                                    onClick={() => setPinModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <Key className="h-4 w-4" />
                                    PIN Ata
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* İletişim Bilgileri Section */}
            <div className="bg-gray-50 rounded-lg border border-gray-200">
                <button
                    onClick={() => toggleSection('contactInfo')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 transition-colors"
                >
                    <h3 className="text-lg font-medium text-gray-900">İletişim Bilgileri</h3>
                    {sectionsOpen.contactInfo ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                </button>
                {sectionsOpen.contactInfo && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            {!editModeContact && (
                                <button onClick={() => setEditModeContact(true)} className="flex items-center text-sm text-blue-600 hover:underline ml-auto">
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
                )}
            </div>

            {/* Hesap Güvenliği Section */}
            <div className="bg-gray-50 rounded-lg border border-gray-200">
                <button
                    onClick={() => toggleSection('accountSecurity')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 transition-colors"
                >
                    <h3 className="text-lg font-medium text-gray-900">Hesap Güvenliği</h3>
                    {sectionsOpen.accountSecurity ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                </button>
                {sectionsOpen.accountSecurity && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                        <div className="mt-4">
                            {lockStatusLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                    <span className="text-sm text-gray-600">Güvenlik durumu kontrol ediliyor...</span>
                                </div>
                            ) : lockStatus && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Hesap Durumu:</span>
                                        {lockStatus.isLocked ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <Shield className="h-3 w-3 mr-1" />
                                                Kilitli
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Aktif
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="font-medium text-gray-700">Kalan Deneme:</span>
                                            <span className="ml-2 text-gray-900">{lockStatus.remainingAttempts} / 4</span>
                                        </div>
                                        {lockStatus.lockStartTime && (
                                            <div>
                                                <span className="font-medium text-gray-700">Kilit Başlangıcı:</span>
                                                <span className="ml-2 text-gray-900">{new Date(lockStatus.lockStartTime).toLocaleString('tr-TR')}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {lockStatus.isLocked && (
                                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-red-800">Hesap Kilitlendi</p>
                                                    {lockStatus.lockEndTime && (
                                                        <p className="text-sm text-red-700 mt-1">
                                                            Kilit Bitiş: {new Date(lockStatus.lockEndTime).toLocaleString('tr-TR')}
                                                        </p>
                                                    )}
                                                    <button
                                                        onClick={handleUnlockAccount}
                                                        disabled={loading}
                                                        className="flex items-center gap-2 mt-3 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                                                    >
                                                        <Unlock className="h-4 w-4" />
                                                        {loading ? 'Kilit Açılıyor...' : 'Kilidi Aç'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div>
                <button
                    onClick={() => setDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Öğretmeni Kalıcı Olarak Sil"
                >
                    <Trash2 className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium">Öğretmeni Sil</span>
                </button>
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
                title="Öğretmeni Kalıcı Olarak Sil"
                description={
                    <div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-medium text-red-800 mb-2">⚠️ Dikkat: Kalıcı Veri Kaybı!</h4>
                                    <p className="text-sm text-red-700">
                                        Bu işlem <strong>geri alınamaz</strong> ve aşağıdaki verilerin <strong>kalıcı olarak kaybına</strong> neden olacaktır:
                                    </p>
                                    <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                                        <li>Öğretmenin tüm kişisel bilgileri</li>
                                        <li>Sorumlu olduğu öğrenci stajları</li>
                                        <li>Onayladığı tüm dekont kayıtları</li>
                                        <li>Haftalık program bilgileri</li>
                                        <li>Giriş geçmişi ve sistem logları</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <p className="text-gray-900 font-medium mb-4">
                            "{ogretmen.ad} {ogretmen.soyad}" adlı öğretmeni sistemden kalıcı olarak silmek istediğinize emin misiniz?
                        </p>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bu işlemi onaylamak için "<strong>SİL</strong>" yazın:
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="w-full p-2 border rounded mt-1 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="SİL"
                            />
                        </div>
                    </div>
                }
                confirmText="Sil"
                isLoading={loading}
            />
        </div>
    )
}