'use client'

import { useEffect, useState } from 'react'
import { Loader, Check, Clock, Search, Filter, User, Calendar, Trash2, PlusCircle, BookOpen, Download, QrCode } from 'lucide-react'
import { format, parseISO, startOfWeek, addDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import GorevBelgesiModal from '@/components/ui/GorevBelgesiModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import BarcodeModal from '@/components/ui/BarcodeModal'

interface GorevBelgesi {
    id: string;
    hafta: string;
    durum: string;
    barcode: string;
    created_at: string;
    ogretmenler: {
        ad: string;
        soyad: string;
    } | null;
}

interface Alan {
   id: string;
   ad: string;
}

export default function GorevTakipPage() {
    const [belgeler, setBelgeler] = useState<GorevBelgesi[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [alanlar, setAlanlar] = useState<Alan[]>([]);
    const [selectedAlanId, setSelectedAlanId] = useState('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [refetchToggle, setRefetchToggle] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
    const [selectedBarcode, setSelectedBarcode] = useState<string>('');
    const [bulkAction, setBulkAction] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
       const fetchAlanlar = async () => {
           try {
               const response = await fetch('/api/admin/alanlar')
               if (response.ok) {
                   const data = await response.json()
                   setAlanlar(data)
               }
           } catch (error) {
               console.error('Alanlar yüklenirken hata:', error)
           }
       }
       fetchAlanlar();
    }, []);

    useEffect(() => {
       const fetchBelgeler = async () => {
           setLoading(true);
           setSelectedIds([]);
           
           const from = (currentPage - 1) * ITEMS_PER_PAGE;

           try {
               const params = new URLSearchParams({
                   status: statusFilter,
                   alanId: selectedAlanId,
                   search: searchTerm,
                   limit: ITEMS_PER_PAGE.toString(),
                   offset: from.toString()
               });

               const response = await fetch(`/api/admin/gorev-belgeleri?${params}`);
               if (!response.ok) throw new Error('API isteği başarısız');

               const data = await response.json();

               const formattedData = data.map((item: any) => ({
                   id: item.id,
                   hafta: item.hafta,
                   durum: item.durum,
                   barcode: item.barcode,
                   created_at: item.created_at,
                   ogretmenler: {
                       ad: item.ogretmen_ad,
                       soyad: item.ogretmen_soyad,
                   },
               }));

               setBelgeler(formattedData as GorevBelgesi[]);
               setTotalCount(data.length > 0 ? data[0].total_count : 0);

           } catch (err) {
               console.error("Görev belgeleri çekilirken hata:", err);
               toast.error("Veriler yüklenirken bir hata oluştu.");
           } finally {
               setLoading(false);
           }
       };

       fetchBelgeler();
    }, [currentPage, statusFilter, selectedAlanId, refetchToggle, searchTerm]);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/admin/gorev-belgeleri/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ durum: newStatus })
            });

            if (!response.ok) throw new Error('API isteği başarısız');
            
            toast.success("Durum güncellendi.")
            setRefetchToggle(prev => !prev); // Trigger refetch
        } catch (error) {
            toast.error("Durum güncellenirken bir hata oluştu.")
            console.error(error)
        }
    }

    const handleDelete = (ids: string[]) => {
       if (ids.length === 0) return;
       setItemToDelete(ids);
       setIsConfirmOpen(true);
    }

    const executeDelete = async () => {
       if (itemToDelete.length === 0) return;
       
       setIsDeleting(true);
       try {
           const response = await fetch(`/api/admin/gorev-belgeleri?ids=${itemToDelete.join(',')}`, {
               method: 'DELETE'
           });

           if (!response.ok) throw new Error('API isteği başarısız');

           toast.success(`${itemToDelete.length} belge başarıyla silindi.`);
           setSelectedIds([]);
           // If the current page might become empty, go to the previous page
           if (belgeler.length === itemToDelete.length && currentPage > 1) {
               setCurrentPage(prev => prev - 1);
           } else {
               setRefetchToggle(prev => !prev); // Otherwise, just refetch
           }
       } catch (error) {
           toast.error("Belgeler silinirken bir hata oluştu.");
           console.error(error);
       } finally {
           setIsDeleting(false);
           setIsConfirmOpen(false);
           setItemToDelete([]);
       }
    }

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
       if (e.target.checked) {
           setSelectedIds(belgeler.map(b => b.id));
       } else {
           setSelectedIds([]);
       }
    }

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }

    const handleBulkAction = async () => {
        if (selectedIds.length === 0 || !bulkAction) return;

        if (bulkAction === 'delete') {
            handleDelete(selectedIds);
            return;
        }

        setIsProcessing(true);
        try {
            for (const id of selectedIds) {
                await handleStatusUpdate(id, bulkAction);
            }
            toast.success(`${selectedIds.length} belge durumu güncellendi.`);
            setSelectedIds([]);
            setBulkAction('');
        } catch (error) {
            toast.error("Toplu işlem sırasında bir hata oluştu.");
        } finally {
            setIsProcessing(false);
        }
    }

    const formatDetay = (hafta: string) => {
        if (!hafta || !hafta.includes('-W')) return "Haftalık Belge";
        const [year, weekNumber] = hafta.split('-W');
        const weekStart = startOfWeek(parseISO(`${year}-01-01`), { weekStartsOn: 1 });
        const targetDate = addDays(weekStart, (parseInt(weekNumber) - 1) * 7);
        const endDate = addDays(targetDate, 4); // 5 günlük iş haftası
        return `Haftalık Belge(${format(targetDate, 'dd')}-${format(endDate, 'dd MMMM', { locale: tr })})`;
    }

    const handleDownload = (belgeId: string) => {
        try {
            // Print sayfasını yeni sekmede aç
            const printUrl = `/gorev-belgesi/yazdir/${belgeId}`;
            window.open(printUrl, '_blank');
            
            toast.success('Belge yazdırma sayfası açıldı');
        } catch (error) {
            console.error('Belge açma hatası:', error);
            toast.error('Belge açılamadı');
        }
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader className="animate-spin h-8 w-8" /></div>
    }

    return (
        <>
        <GorevBelgesiModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        <ConfirmModal
           isOpen={isConfirmOpen}
           onClose={() => setIsConfirmOpen(false)}
           onConfirm={executeDelete}
           title="Belgeleri Sil"
           description={`${itemToDelete.length} adet belgeyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
           confirmText="Evet, Sil"
           isLoading={isDeleting}
        />
        <BarcodeModal
           isOpen={barcodeModalOpen}
           onClose={() => setBarcodeModalOpen(false)}
           barcode={selectedBarcode}
        />
        <div className="p-8">
           <div className="flex items-center justify-between mb-6">
               <h1 className="text-3xl font-bold">Görev Belgesi Takibi</h1>
               <button
                   onClick={() => setIsModalOpen(true)}
                   className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
               >
                   <PlusCircle className="h-5 w-5" />
                   Yeni Belge Oluştur
               </button>
           </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Öğretmen veya hafta ara..."
                        value={searchTerm}
                        onChange={e => {
                           setSearchTerm(e.target.value);
                           setCurrentPage(1);
                        }}
                        className="pl-10 pr-4 py-2 block w-full border border-gray-300 rounded-lg"
                    />
                </div>
                <div className="relative">
                   <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                   <select
                       value={selectedAlanId}
                       onChange={e => {
                          setSelectedAlanId(e.target.value);
                          setCurrentPage(1);
                       }}
                       className="pl-10 pr-4 py-2 block w-full border border-gray-300 rounded-lg"
                   >
                       <option value="all">Tüm Alanlar</option>
                       {alanlar.map(alan => (
                           <option key={alan.id} value={alan.id}>{alan.ad}</option>
                       ))}
                   </select>
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={e => {
                           setStatusFilter(e.target.value);
                           setCurrentPage(1);
                        }}
                        className="pl-10 pr-4 py-2 block w-full border border-gray-300 rounded-lg"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="Basıldı">Basıldı</option>
                        <option value="Verildi">Verildi</option>
                        <option value="Teslim Alındı">Teslim Alındı</option>
                        <option value="İptal Edildi">İptal Edildi</option>
                    </select>
                </div>
                <div className="flex gap-2">
                   {selectedIds.length > 0 && (
                       <>
                           <select
                               value={bulkAction}
                               onChange={(e) => setBulkAction(e.target.value)}
                               className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                           >
                               <option value="">İşlem Seçin</option>
                               <option value="Verildi">Verildi Olarak İşaretle</option>
                               <option value="Teslim Alındı">Teslim Alındı Olarak İşaretle</option>
                               <option value="delete">Sil</option>
                           </select>
                           <button
                               onClick={handleBulkAction}
                               disabled={!bulkAction || isProcessing}
                               className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                               {isProcessing ? (
                                   <Loader className="h-4 w-4 mr-2 animate-spin" />
                               ) : (
                                   <Check className="h-4 w-4 mr-2" />
                               )}
                               ({selectedIds.length}) Belgeye Uygula
                           </button>
                       </>
                   )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                           <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                               <input
                                   type="checkbox"
                                   className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                   checked={belgeler.length > 0 && selectedIds.length === belgeler.length}
                                   onChange={handleSelectAll}
                                   disabled={belgeler.length === 0}
                               />
                           </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öğretmen</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detay</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barkod</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oluşturulma</th>
                           <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                           <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {belgeler.map(belge => (
                            <tr key={belge.id} className={selectedIds.includes(belge.id) ? 'bg-indigo-50' : undefined}>
                               <td className="relative px-7 sm:w-12 sm:px-6">
                                   <input
                                       type="checkbox"
                                       className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                       checked={selectedIds.includes(belge.id)}
                                       onChange={() => handleSelectOne(belge.id)}
                                   />
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <User className="h-4 w-4 mr-2 text-gray-500" />
                                        {belge.ogretmenler?.ad} {belge.ogretmenler?.soyad}
                                    </div>
                                </td>
                               <td className="px-6 py-4 whitespace-nowrap">{formatDetay(belge.hafta)}</td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                   <button
                                       onClick={() => {
                                           setSelectedBarcode(belge.barcode || '');
                                           setBarcodeModalOpen(true);
                                       }}
                                       className="text-blue-600 hover:text-blue-900 flex items-center text-xs font-mono"
                                       title="Barkodu Göster"
                                   >
                                       <QrCode className="h-3 w-3 mr-1" />
                                       {belge.barcode || 'N/A'}
                                   </button>
                               </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {format(new Date(belge.created_at), 'dd.MM.yyyy HH:mm')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                        belge.durum === 'Teslim Alındı' ? 'bg-green-100 text-green-800' :
                                        belge.durum === 'Verildi' ? 'bg-yellow-100 text-yellow-800' :
                                        belge.durum === 'Basıldı' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {belge.durum}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                       onClick={() => handleDownload(belge.id)}
                                       className="text-blue-600 hover:text-blue-900"
                                       title="Belgeyi İndir"
                                    >
                                       <Download className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {belgeler.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-500">
                        <p>Filtrelerle eşleşen belge bulunamadı.</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow-sm">
               <div className="flex flex-1 justify-between sm:hidden">
                   <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Önceki</button>
                   <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages || totalPages === 0} className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Sonraki</button>
               </div>
               <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                   <div>
                       <p className="text-sm text-gray-700">
                           <span className="font-medium">{totalCount}</span> sonuçtan <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> arası gösteriliyor
                       </p>
                   </div>
                   <div>
                       <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                           <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                               <span className="sr-only">Önceki</span>
                               {'<'}
                           </button>
                           <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                               Sayfa {currentPage} / {totalPages > 0 ? totalPages : 1}
                           </span>
                           <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages || totalPages === 0} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                               <span className="sr-only">Sonraki</span>
                               {'>'}
                           </button>
                       </nav>
                   </div>
               </div>
           </div>
        </div>
        </>
    )
}