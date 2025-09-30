/**
 * PWA (Progressive Web App) yardımcı fonksiyonları
 */

/**
 * Uygulamanın PWA standalone modunda (telefona yüklü uygulama olarak) çalışıp çalışmadığını kontrol eder
 * @returns {boolean} PWA standalone modunda ise true, tarayıcıda ise false
 */
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 1. Display mode kontrolü (en güvenilir yöntem)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // 2. iOS Safari için özel kontrol
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  // 3. Android için özel kontrol
  const isAndroidStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  return isStandalone || isIOSStandalone || isAndroidStandalone;
}

/**
 * PWA'yı kapatır (uygulamayı sonlandırır)
 */
export function closePWA(): void {
  if (typeof window === 'undefined') return;
  
  // PWA'da window.close() çalışabilir
  if (isPWAInstalled()) {
    // Ana sayfaya yönlendir ve ardından kapat
    window.location.href = '/';
    
    // Biraz bekleyip kapat
    setTimeout(() => {
      window.close();
    }, 100);
  }
}
