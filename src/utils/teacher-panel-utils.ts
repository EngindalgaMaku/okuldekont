import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { Dekont, StatusInfo, CompanyStyles, Isletme } from '@/types/teacher-panel';

// Dosya adı kısaltma fonksiyonu
export const truncateFileName = (fileName: string, maxLength: number = 40) => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4);
  return `${truncatedName}...${extension}`;
};

// Tarih fonksiyonları
export const getCurrentMonth = () => new Date().getMonth() + 1;
export const getCurrentYear = () => new Date().getFullYear();
export const getCurrentDay = () => new Date().getDate();

// Gecikme durumunu kontrol et (ayın 10'undan sonra)
export const isGecikme = () => getCurrentDay() > 10;

// Kritik süre kontrolü (ayın 1-10'u arası)
export const isKritikSure = () => {
  const day = getCurrentDay();
  return day >= 1 && day <= 10;
};

// Ay isimleri
export const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Belge türü formatlama fonksiyonu
export const formatBelgeTur = (tur: string) => {
  switch (tur) {
    case 'Sözleşme':
    case 'sozlesme':
      return 'Sözleşme'
    case 'Fesih Belgesi':
    case 'fesih_belgesi':
      return 'Fesih Belgesi'
    case 'Usta Öğreticilik Belgesi':
    case 'usta_ogretici_belgesi':
      return 'Usta Öğretici Belgesi'
    default:
      return tur
  }
};

// Belge onay durumu için yardımcı fonksiyon
export const getBelgeDurum = (durum: 'PENDING' | 'APPROVED' | 'REJECTED'): StatusInfo => {
  switch (durum) {
    case 'APPROVED':
      return { text: 'Onaylandı', icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-100' };
    case 'REJECTED':
      return { text: 'Reddedildi', icon: XCircle, color: 'text-red-700', bg: 'bg-red-100' };
    case 'PENDING':
    default:
      return { text: 'Bekliyor', icon: Clock, color: 'text-yellow-700', bg: 'bg-yellow-100' };
  }
};

// Onay durumu için yardımcı fonksiyon
export const getDurum = (durum: Dekont['onay_durumu']): StatusInfo => {
  switch (durum) {
    case 'onaylandi':
      return { text: 'Onaylandı', icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-100' };
    case 'reddedildi':
      return { text: 'Reddedildi', icon: XCircle, color: 'text-red-700', bg: 'bg-red-100' };
    case 'bekliyor':
    default:
      return { text: 'Bekliyor', icon: Clock, color: 'text-yellow-700', bg: 'bg-yellow-100' };
  }
};

// İşletme stil fonksiyonu
export const getCompanyStyles = (isletme: Isletme): CompanyStyles => {
  if (isletme.color_scheme) {
    return {
      border: `2px solid ${isletme.color_scheme.accent}`,
      background: `linear-gradient(135deg, ${isletme.color_scheme.secondary} 0%, white 100%)`,
      iconBg: isletme.color_scheme.secondary,
      iconColor: isletme.color_scheme.primary
    };
  }
  
  // Fallback styling based on company type
  switch (isletme.company_type) {
    case 'tech':
      return {
        border: '2px solid #C7D2FE',
        background: 'linear-gradient(135deg, #EEF2FF 0%, white 100%)',
        iconBg: '#EEF2FF',
        iconColor: '#4F46E5'
      };
    case 'accounting':
      return {
        border: '2px solid #A7F3D0',
        background: 'linear-gradient(135deg, #ECFDF5 0%, white 100%)',
        iconBg: '#ECFDF5',
        iconColor: '#059669'
      };
    default:
      return {
        border: '2px solid #E5E7EB',
        background: 'linear-gradient(135deg, #F9FAFB 0%, white 100%)',
        iconBg: '#F9FAFB',
        iconColor: '#6B7280'
      };
  }
};

// Dosya indirme handler'ı
export const handleFileDownload = async (dosyaUrl: string, fileName: string) => {
  try {
    // URL'den dosya adını çıkar
    const urlParts = dosyaUrl.split('/');
    const originalFileName = urlParts[urlParts.length - 1];
    
    // API endpoint'i kullanarak dosyayı indir
    const downloadUrl = `/api/admin/dekontlar/download/${originalFileName}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${fileName}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Dosya indirme hatası:', error);
    alert('Dosya indirilemedi. Lütfen tekrar deneyin.');
  }
};

// Dosya görüntüleme handler'ı
export const handleFileView = async (dosyaUrl: string) => {
  try {
    window.open(dosyaUrl, '_blank');
  } catch (error) {
    console.error('Dosya görüntüleme hatası:', error);
    alert('Dosya görüntülenemedi. Lütfen tekrar deneyin.');
  }
};