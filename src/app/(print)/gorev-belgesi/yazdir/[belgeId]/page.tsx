'use client'

import React, { useEffect, useState, Suspense, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader, AlertTriangle, ArrowLeft, Printer } from 'lucide-react'
import { format, parseISO, startOfWeek, addDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

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
  const belgeId = params.belgeId as string

  const [loading, setLoading] = useState(true)
  const [ogretmen, setOgretmen] = useState<OgretmenDetay | null>(null)
  const [deputyHeadName, setDeputyHeadName] = useState('');
  const [error, setError] = useState<string | null>(null)
  const [belgeData, setBelgeData] = useState<{hafta: string, isletme_idler: string[], barcode?: string}|null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')


  useEffect(() => {
    const fetchData = async () => {
        if (!belgeId) {
            setError("Belge ID'si bulunamadı.")
            setLoading(false)
            return;
        }

        setLoading(true)
        setError(null)
        try {
            // Public API endpoint'inden veri çek
            const response = await fetch(`/api/public/gorev-belgeleri/${belgeId}/print`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            setBelgeData(data.belgeData);
            setOgretmen(data.ogretmenDetay);
            setDeputyHeadName(data.deputyHeadName || '');

        } catch (err: any) {
            setError(err.message || 'Veri yüklenirken bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }
    
    fetchData()
  }, [belgeId])

  const gunlerMap: { [key: string]: number } = { 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5 };
  
  const getTarihForGun = (gun: string) => {
      if (!belgeData?.hafta) return '';
      const [year, weekNumber] = belgeData.hafta.split('-W');
      const weekStart = startOfWeek(parseISO(`${year}-01-01`), { weekStartsOn: 1 });
      const targetDate = addDays(weekStart, ((parseInt(weekNumber) - 1) * 7) + (gunlerMap[gun] - 1));
      return format(targetDate, 'dd.MM.yyyy');
  }

  const programByIsletme = useMemo(() => {
   if (!ogretmen || !belgeData) return {};
   
   const grouped: { [key: string]: Program[] } = {};
   ogretmen.koordinatorluk_programi
     .filter(p => belgeData.isletme_idler.includes(p.isletme_id))
     .forEach(p => {
       if (!grouped[p.isletme_id]) {
         grouped[p.isletme_id] = [];
       }
       grouped[p.isletme_id].push(p);
     });
   return grouped;
  }, [ogretmen, belgeData]);

 // Barkod oluşturma useEffect'i - her sayfa için ayrı canvas
 useEffect(() => {
   if (belgeData && !loading && programByIsletme) {
     const barcodeText = belgeData.barcode || belgeId || 'NO-BARCODE';
     
     // Her işletme sayfası için ayrı barkod oluştur
     Object.keys(programByIsletme).forEach(isletmeId => {
       try {
         const canvas = document.getElementById(`barcode-canvas-${isletmeId}`) as HTMLCanvasElement;
         if (canvas) {
           JsBarcode(canvas, barcodeText, {
             format: "CODE128",
             width: 1.5,
             height: 30,
             displayValue: true,
             fontSize: 10,
             margin: 0
           });
         }
       } catch (error) {
         console.error(`Barkod oluşturulamadı (${isletmeId}):`, error);
         // Fallback olarak text göster
         const canvas = document.getElementById(`barcode-canvas-${isletmeId}`) as HTMLCanvasElement;
         if (canvas) {
           const ctx = canvas.getContext('2d');
           if (ctx) {
             canvas.width = 150;
             canvas.height = 30;
             ctx.fillStyle = '#000';
             ctx.font = '10px Arial';
             ctx.textAlign = 'center';
             ctx.fillText(barcodeText, 75, 20);
           }
         }
       }
     });
   }
 }, [belgeData, loading, belgeId, programByIsletme])

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
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color: black !important;
          }
          .printable-area {
            margin: 0 !important;
            padding: 0 !important;
            color: black !important;
          }
          .print-controls {
            display: none !important;
          }
          .page-container {
            page-break-after: always !important;
            page-break-before: auto !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 5mm !important;
            border: none !important;
            color: black !important;
            height: 100vh !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }
        }
        @page {
           size: A4;
           margin: 0;
           -webkit-print-color-adjust: exact;
           print-color-adjust: exact;
        }
        @media print {
           html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
           }
        }
        .form-table, .form-table th, .form-table td {
            border: 1px solid black;
            border-collapse: collapse;
            padding: 2px;
            font-size: 9pt;
            color: black !important;
        }
        .printable-area {
          color: black !important;
        }
        .printable-area * {
          color: black !important;
        }
        h1, h2, h3, h4, h5, h6 {
          color: black !important;
        }
        p, td, th, span, div {
          color: black !important;
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
             <div key={isletmeId} className="page-container w-full h-full mx-auto flex flex-col bg-white">
                <h1 className="text-center font-bold text-xs mb-2">İŞLETMELERDE MESLEK EĞİTİMİ GÜNLÜK REHBERLİK GÖREV FORMU</h1>
                
                {/* Top Info Block */}
                <table className="form-table w-full mb-1">
                    <tbody>
                        <tr>
                            <td className="font-bold w-1/4 text-xs p-1">İşletmenin Adı / Öğrenci Sayısı</td>
                            <td className="text-xs p-1">{isletme.ad} / {isletmedekiOgrenciler.length}</td>
                        </tr>
                        <tr>
                            <td className="font-bold text-xs p-1">İşletmede Sorumlu Olduğu Öğrenci Sayısı</td>
                            <td className="text-xs p-1">{isletmedekiOgrenciler.length}</td>
                        </tr>
                        <tr>
                            <td className="font-bold text-xs p-1">Meslek Alan/Dalı</td>
                            <td className="text-xs p-1">{ogretmen?.alan?.ad}</td>
                        </tr>
                        <tr>
                            <td className="font-bold text-xs p-1">Görev Tarihi</td>
                            <td className="text-xs p-1">{gorevTarihleri}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Rehberlik Block */}
                <table className="form-table w-full mb-1">
                    <thead>
                        <tr><th className="text-left p-1 font-bold text-xs">Aylık Rehberlik Formuna Göre :</th></tr>
                    </thead>
                    <tbody>
                        <tr><td className="p-3 h-12 align-top text-xs">İşletmede öğrenim gören öğrencilerin eğitimini olumsuz yönde etkiliyen hususlar: (varsa yazınız)</td></tr>
                        <tr><td className="p-3 h-12 align-top text-xs">Belirlenen aksaklıklarla ilgili yapılan rehberlik ve alınan önlemler:</td></tr>
                        <tr><td className="p-3 h-12 align-top text-xs">Aylık Rehberlik formunda belirtilmesinde yarar görülen hususlar:</td></tr>
                    </tbody>
                </table>

                {/* Signatures Block */}
                <table className="w-full mb-1 mt-2 text-center" style={{borderCollapse: 'collapse'}}>
                    <tbody>
                        <tr>
                            <td className="w-1/3 text-xs p-1 pt-2" style={{borderLeft: '1px solid black'}}>İşletme Eğitim Yetkilisi</td>
                            <td className="w-1/3 text-xs p-1 pt-2">Koordinatör Öğretmen</td>
                            <td className="w-1/3 text-xs p-1 pt-2" style={{borderRight: '1px solid black'}}>Koordinatör Müdür Yardımcısı</td>
                        </tr>
                        <tr>
                            <td className="pt-3 pb-2 text-xs" style={{borderLeft: '1px solid black'}}>KUBİLAY CEM KABACAN</td>
                            <td className="pt-3 pb-2 text-xs">{ogretmen?.ad} {ogretmen?.soyad}</td>
                            <td className="pt-3 pb-2 text-xs" style={{borderRight: '1px solid black'}}>{deputyHeadName}</td>
                        </tr>
                        <tr>
                            <td className="text-xs pb-6" style={{borderLeft: '1px solid black'}}>İmza/Kaşe</td>
                            <td className="text-xs pb-6">İmza/Kaşe</td>
                            <td className="text-xs pb-6" style={{borderRight: '1px solid black'}}>İmza/Kaşe</td>
                        </tr>
                    </tbody>
                </table>

                {/* Student List */}
                <table className="form-table w-full flex-grow">
                    <thead>
                        <tr>
                            <th className="w-[12%] text-xs p-1">Sınıfı</th>
                            <th className="w-[12%] text-xs p-1">Öğrenci No</th>
                            <th className="text-xs p-1">Adı ve Soyadı</th>
                            <th className="w-[25%] text-xs p-1">Çalıştığı İşletme Ünitesi</th>
                            <th className="w-[20%] text-xs p-1">Devam Durumu (İmza)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isletmedekiOgrenciler.map(o => (
                            <tr key={o.id}>
                                <td className="text-xs p-1 h-8 align-middle">{o.sinif}</td>
                                <td className="text-xs p-1 h-8 align-middle">{o.no}</td>
                                <td className="text-xs p-1 h-8 align-middle">{o.ad} {o.soyad}</td>
                                <td className="text-xs p-1 h-8 align-middle"></td>
                                <td className="text-xs p-1 h-8 align-middle"></td>
                            </tr>
                        ))}
                        {/* Empty rows */}
                        {Array.from({ length: Math.max(0, 10 - isletmedekiOgrenciler.length) }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="text-xs p-1 h-8 align-middle">&nbsp;</td>
                                <td className="text-xs p-1 h-8 align-middle"></td>
                                <td className="text-xs p-1 h-8 align-middle"></td>
                                <td className="text-xs p-1 h-8 align-middle"></td>
                                <td className="text-xs p-1 h-8 align-middle"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer with Barcode */}
                <div className="border-2 border-black p-1 mt-auto">
                   <p className="text-left text-xs"><strong className="font-bold">AÇIKLAMALAR:</strong> Bu form koordinatör öğretmen tarafından her görev haftası başında koordinatör Md. Yrd.'ndan alınır. Görev sonrasında okula geldiği gün içinde imzaları tamamlanmış olarak Koordinatör Md. Yrd.'na teslim edilir.</p>
                   <div className="bg-gray-200 p-1 text-center mt-1">
                       <p className="text-xs">Bu form "Aylık Rehberlik Formu"'nun doldurulmasında esas alınır ve rapora eklenir.</p>
                   </div>
                   {/* Barcode Area */}
                   <div className="flex justify-center mt-1">
                     <div className="text-center">
                       <div className="text-xs text-gray-600 mb-1">Belge No: {belgeData?.barcode || belgeId}</div>
                       <canvas id={`barcode-canvas-${isletmeId}`} className="border border-gray-300"></canvas>
                     </div>
                   </div>
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