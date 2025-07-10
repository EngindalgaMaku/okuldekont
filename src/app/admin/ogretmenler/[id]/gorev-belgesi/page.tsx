'use client'

import React, { useEffect, useState, Suspense, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader, AlertTriangle, ArrowLeft, Printer } from 'lucide-react'
import { format, parseISO, startOfWeek, addDays } from 'date-fns'
import { tr } from 'date-fns/locale'

// --- Type Definitions ---
interface StajOgrenci {
  id: string;
  ad: string;
  soyad: string;
  no: string;
  sinif: string;
}

interface Program {
  id?: string;
  isletme_id: string;
  gun: string;
  saat_araligi: string;
}

interface OgretmenDetay {
  ad: string;
  soyad: string;
  alan: { ad: string } | null;
  stajlar: {
      isletme_id: string;
      isletmeler: { id: string; ad: string; } | null;
      ogrenciler: StajOgrenci | null;
  }[];
  koordinatorluk_programi: Program[];
}

// --- Main Page Component ---
function GorevBelgesiYazdirma() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const ogretmenId = params.id as string

  const [loading, setLoading] = useState(true)
  const [ogretmen, setOgretmen] = useState<OgretmenDetay | null>(null)
  const [deputyHeadName, setDeputyHeadName] = useState('');
  const [error, setError] = useState<string | null>(null)

  const selectedWeek = searchParams.get('week')
  const selectedIsletmeler = searchParams.getAll('isletme')

  useEffect(() => {
    const fetchDataAndCreateBelge = async () => {
        if (!ogretmenId || !selectedWeek || selectedIsletmeler.length === 0) {
            setError("Gerekli parametreler eksik (hafta veya işletme seçilmedi).")
            setLoading(false)
            return;
        }

        const overwrite = searchParams.get('overwrite') === 'true';

        setLoading(true)
        setError(null)
        try {
            // 1. If overwriting, invalidate old documents first
            if (overwrite) {
                const { error: updateError } = await supabase
                    .from('gorev_belgeleri')
                    .update({ durum: 'İptal Edildi' })
                    .eq('ogretmen_id', ogretmenId)
                    .eq('hafta', selectedWeek)
                    .in('durum', ['Verildi', 'Teslim Alındı']);
                
                if (updateError) {
                   console.error("Eski belgeler iptal edilirken hata:", updateError);
                   throw new Error("Mevcut belge iptal edilemediği için yeni belge oluşturulamadı.");
                }
            }

            // 2. Fetch teacher and deputy head data
            const { data: ogretmenData, error: rpcError } = await supabase.rpc('get_ogretmen_koordinatorluk_detay', { p_ogretmen_id: ogretmenId })
            if (rpcError) throw rpcError
            setOgretmen(ogretmenData)

            const { data: deputyNameData, error: deputyError } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'coordinator_deputy_head_name')
            if (deputyError) console.error("Müdür yardımcısı adı çekilirken hata:", deputyError);
            if (deputyNameData && deputyNameData.length > 0) setDeputyHeadName(deputyNameData[0].value as string);


            // 3. Create and store the new document record
            const { data: belgeData, error: belgeError } = await supabase
                .from('gorev_belgeleri')
                .insert({
                    ogretmen_id: ogretmenId,
                    hafta: selectedWeek,
                    isletme_idler: selectedIsletmeler
                })
                .select('id')
                .single()
            
            if (belgeError) throw belgeError
            // We don't need to set belgeId anymore as it's not displayed

        } catch (err: any) {
            setError(err.message || 'Veri yüklenirken veya belge kaydı oluşturulurken bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }
    
    fetchDataAndCreateBelge()
  }, [ogretmenId, selectedWeek, JSON.stringify(selectedIsletmeler), searchParams])


  const gunlerMap: { [key: string]: number } = { 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5 };
  
  const getTarihForGun = (gun: string) => {
      if (!selectedWeek) return '';
      const [year, weekNumber] = selectedWeek.split('-W');
      const weekStart = startOfWeek(parseISO(`${year}-01-01`), { weekStartsOn: 1 });
      const targetDate = addDays(weekStart, ((parseInt(weekNumber) - 1) * 7) + (gunlerMap[gun] - 1));
      return format(targetDate, 'dd.MM.yyyy');
  }

  const programByIsletme = useMemo(() => {
   if (!ogretmen) return {};
   
   const grouped: { [key: string]: Program[] } = {};
   ogretmen.koordinatorluk_programi
     .filter(p => selectedIsletmeler.includes(p.isletme_id))
     .forEach(p => {
       if (!grouped[p.isletme_id]) {
         grouped[p.isletme_id] = [];
       }
       grouped[p.isletme_id].push(p);
     });
   return grouped;
  }, [ogretmen, selectedIsletmeler]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader className="animate-spin h-8 w-8" /></div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-700 p-4">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">Bir Hata Oluştu</h2>
        <p className="text-center mb-4">{error}</p>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          .print-controls { display: none; }
          .page-break { page-break-after: always; }
           @page {
              size: A4;
              margin: 10mm;
           }
        }
        .form-table, .form-table th, .form-table td {
            border: 1px solid black;
            border-collapse: collapse;
            padding: 4px;
            font-size: 10pt;
        }
      `}</style>
      <div className="print-controls bg-gray-100 p-4 flex justify-center items-center gap-4 sticky top-0 z-10">
         <button onClick={() => router.back()} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
        </button>
        <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Printer className="h-4 w-4 mr-2" />
            Yazdır
        </button>
      </div>
      <div className="printable-area bg-white font-['Times_New_Roman']">
        {Object.keys(programByIsletme).map((isletmeId) => {
           const programlar = programByIsletme[isletmeId];
           const isletme = ogretmen?.stajlar.find(s => s.isletmeler?.id === isletmeId)?.isletmeler;
           const isletmedekiOgrenciler = ogretmen?.stajlar.filter(s => s.isletme_id === isletmeId).map(s => s.ogrenciler).filter(Boolean) as StajOgrenci[];

           if (!isletme) return null;

           const uniqueTarihler = Array.from(new Set(programlar.map(p => getTarihForGun(p.gun))));
           const gorevTarihleri = uniqueTarihler.join(', ');

           return (
             <div key={isletmeId} className="w-[210mm] h-[297mm] mx-auto my-4 p-4 flex flex-col">
                <h1 className="text-center font-bold text-lg mb-2">İŞLETMELERDE MESLEK EĞİTİMİ GÜNLÜK REHBERLİK GÖREV FORMU</h1>
                
                {/* Top Info Block */}
                <table className="form-table w-full mb-2">
                    <tbody>
                        <tr>
                            <td className="font-bold w-1/4">İşletmenin Adı / Öğrenci Sayısı</td>
                            <td>{isletme.ad} / {isletmedekiOgrenciler.length}</td>
                        </tr>
                        <tr>
                            <td className="font-bold">İşletmede Sorumlu Olduğu Öğrenci Sayısı</td>
                            <td>{isletmedekiOgrenciler.length}</td>
                        </tr>
                        <tr>
                            <td className="font-bold">Meslek Alan/Dalı</td>
                            <td>{ogretmen?.alan?.ad}</td>
                        </tr>
                        <tr>
                            <td className="font-bold">Görev Tarihi</td>
                            <td>{gorevTarihleri}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Rehberlik Block */}
                <table className="form-table w-full mb-2">
                    <thead>
                        <tr><th className="text-left p-1 font-bold">Aylık Rehberlik Formuna Göre :</th></tr>
                    </thead>
                    <tbody>
                        <tr><td className="p-1 h-16 align-top">İşletmede öğrenim gören öğrencilerin eğitimini olumsuz yönde etkiliyen hususlar: (varsa yazınız)</td></tr>
                        <tr><td className="p-1 h-16 align-top">Belirlenen aksaklıklarla ilgili yapılan rehberlik ve alınan önlemler:</td></tr>
                        <tr><td className="p-1 h-16 align-top">Aylık Rehberlik formunda belirtilmesinde yarar görülen hususlar:</td></tr>
                    </tbody>
                </table>

                {/* Signatures Block */}
                <table className="w-full mb-2 text-center">
                    <tbody>
                        <tr>
                            <td className="w-1/3">İşletme Eğitim Yetkilisi</td>
                            <td className="w-1/3">Koordinatör Öğretmen</td>
                            <td className="w-1/3">Koordinatör Müdür Yardımcısı</td>
                        </tr>
                        <tr>
                            <td className="pt-2">KUBİLAY CEM KABACAN</td>
                            <td className="pt-2">{ogretmen?.ad} {ogretmen?.soyad}</td>
                            <td className="pt-2">{deputyHeadName}</td>
                        </tr>
                        <tr>
                            <td>İmza/Kaşe</td>
                            <td>İmza/Kaşe</td>
                            <td>İmza/Kaşe</td>
                        </tr>
                    </tbody>
                </table>

                {/* Student List */}
                <table className="form-table w-full flex-grow">
                    <thead>
                        <tr>
                            <th className="w-[15%]">Sınıfı</th>
                            <th className="w-[15%]">Öğrenci No</th>
                            <th>Adı ve Soyadı</th>
                            <th className="w-[20%]">Çalıştığı İşletme Ünitesi</th>
                            <th className="w-[15%]">Devam Durumu (İmza)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isletmedekiOgrenciler.map(o => (
                            <tr key={o.id}>
                                <td>{o.sinif}</td>
                                <td>{o.no}</td>
                                <td>{o.ad} {o.soyad}</td>
                                <td></td>
                                <td></td>
                            </tr>
                        ))}
                        {/* Empty rows */}
                        {Array.from({ length: 20 - isletmedekiOgrenciler.length }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="h-6">&nbsp;</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="border-2 border-black p-1 mt-auto text-xs text-center">
                    <p className="font-bold">AÇIKLAMALAR: Bu form koordinatör öğretmen tarafından her görev haftası başında koordinatör Md. Yrd. `ndan alınır. Görev sonrasında okula geldiği gün içinde imzaları tamamlanmış olarak Koordinatör Md. Yrd.`na teslim edilir.</p>
                    <p>Bu form "Aylık Rehberlik Formu"`nun doldurulmasında esas alınır ve rapora eklenir.</p>
                </div>
             </div>
           )
        })}
      </div>
    </>
  )
}

// Suspense boundary for client-side components that use searchParams
export default function GorevBelgesiPrintPageWrapper() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader className="animate-spin h-8 w-8" /></div>}>
            <GorevBelgesiYazdirma />
        </Suspense>
    )
}