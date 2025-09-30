"use client";

import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

export default function BrosurPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-8 print:py-4">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center mb-2">
            <AcademicCapIcon className="h-12 w-12 mr-3" />
            <h1 className="text-4xl font-bold">K-PANEL</h1>
          </div>
          <p className="text-center text-xl font-medium">Öğretmen Rehberi</p>
          <p className="text-center text-lg opacity-90 mt-1">
            Hüsniye Özdilek Ticaret Mesleki ve Teknik Anadolu Lisesi
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 print:py-4">
        {/* Sistem Nedir */}
        <section className="bg-white rounded-2xl shadow-lg p-8 mb-6 print:shadow-none print:mb-4">
          <div className="flex items-center mb-4">
            <DevicePhoneMobileIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-900">
              Sistem Nedir?
            </h2>
          </div>
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            <strong>K-PANEL</strong>, Hüsniye Özdilek Ticaret Mesleki ve Teknik
            Anadolu Lisesi öğrencilerinin staj dekontlarını dijital ortamda
            takip etmek için geliştirilmiş bir sistemdir.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            Öğretmenler koordinatörlüğünde, stajyer öğrencilerin aylık çalışma
            dekontları bu sistem üzerinden yüklenir ve onaylanır.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {[
              "Kağıt dekont yerine dijital takip",
              "Öğrencileri tek ekrandan görme",
              "Otomatik dekont hatırlatmaları",
              "Her yerden mobil erişim",
            ].map((item, i) => (
              <div key={i} className="flex items-start">
                <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* İlk Giriş */}
        <section className="bg-white rounded-2xl shadow-lg p-8 mb-6 print:shadow-none print:mb-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            🔑 İlk Giriş
          </h2>

          <div className="bg-indigo-50 border-l-4 border-indigo-600 p-6 mb-6 rounded-r-lg">
            <h3 className="font-bold text-lg text-gray-900 mb-3">
              Giriş Bilgileri
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li>
                <strong>Web Adresi:</strong>{" "}
                <code className="bg-white px-2 py-1 rounded text-indigo-600 font-mono">
                  ozdilek.kodleon.com
                </code>
              </li>
              <li>
                <strong>Kullanıcı Adı:</strong> Ad Soyadınız (ilk 2 harfi
                yazarak listeden seçiniz.)
              </li>
              <li>
                <strong>İlk Giriş Şifresi:</strong>{" "}
                <code className="bg-white px-2 py-1 rounded text-pink-600 font-mono text-xl">
                  2025
                </code>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Önemli: İlk Girişte Şifre Değiştirin!
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Sisteme 2025 şifresi ile giriş yapın</li>
                  <li>
                    Sistem otomatik olarak yeni şifre belirlemenizi isteyecek
                  </li>
                  <li>
                    <strong>Güvenli bir 4 haneli PIN kodu seçin</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 text-sm">
                      <li>Doğum tarihi kullanmayın</li>
                      <li>1234, 0000 gibi basit şifreler seçmeyin</li>
                      <li>Kimseyle paylaşmayın</li>
                    </ul>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Öğrenci Listesi */}
        <section className="bg-white rounded-2xl shadow-lg p-8 mb-6 print:shadow-none print:mb-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            👥 Öğrenci Listesi
          </h2>
          <p className="text-gray-700 text-lg mb-4">
            Giriş yaptıktan sonra koordinatörlüğünüzdeki tüm öğrencileri
            göreceksiniz.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Liste Özellikleri
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li>📋 Öğrenci adı ve işletme bilgisi</li>
              <li>🏢 Hangi işletmede staj yaptığı</li>
              <li>📅 Son dekont yükleme tarihi</li>
              <li>⚠️ Bekleyen/gecikmiş dekontlar</li>
            </ul>
          </div>
        </section>

        {/* Dekont Yükleme */}
        <section className="bg-white rounded-2xl shadow-lg p-8 mb-6 print:shadow-none print:mb-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            📤 Dekont Yükleme İşlemi
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "Öğrenci Seçin",
                items: ["Listeden öğrenciye tıklayın", '"Dekont Yükle" butonuna basın'],
              },
              {
                title: "Dosya Seçin",
                items: [
                  "Fotoğraf çekin veya galeriden seçin",
                  "PDF veya JPG/PNG formatında olabilir",
                ],
              },
              {
                title: "Bilgileri Kontrol Edin",
                items: [
                  "Dekont dönemi otomatik seçilir",
                  "Gerekirse düzeltme yapın",
                ],
              },
              {
                title: "Yükleyin",
                items: ['"Yükle" butonuna basın', "Onay mesajını bekleyin"],
              },
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-start bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg"
              >
                <div className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mr-4 font-bold">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">
                    {step.title}
                  </h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {step.items.map((item, j) => (
                      <li key={j}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dekont Süreleri - ÇOK ÖNEMLİ */}
        <section className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl shadow-lg p-8 mb-6 print:shadow-none print:mb-4">
          <div className="flex items-center mb-6">
            <ClockIcon className="h-10 w-10 text-red-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-900">
              Dekont Süreleri - ÇOK ÖNEMLİ!
            </h2>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full bg-white rounded-lg overflow-hidden shadow">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Dönem</th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="bg-green-50">
                  <td className="px-6 py-4 font-semibold">Ayın 1-10&apos;u</td>
                  <td className="px-6 py-4">Normal dekont yükleme süresi</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✅ Yükleme açık
                    </span>
                  </td>
                </tr>
                <tr className="bg-yellow-50">
                  <td className="px-6 py-4 font-semibold">Ayın 11-15&apos;i</td>
                  <td className="px-6 py-4">Gecikme süresi</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      ⚠️ Uyarı verilir
                    </span>
                  </td>
                </tr>
                <tr className="bg-red-50">
                  <td className="px-6 py-4 font-semibold">
                    Ayın 15&apos;inden sonra
                  </td>
                  <td className="px-6 py-4">Kritik gecikme</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      ❌ Yükleme engellenebilir
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-r-lg">
              <p className="font-semibold text-gray-900 mb-1">
                Sarı Uyarı (11-15 arası)
              </p>
              <p className="text-gray-700">
                &quot;Bu dekont geç yükleniyor!&quot; uyarısı gösterilir
              </p>
            </div>
            <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-r-lg">
              <p className="font-semibold text-gray-900 mb-1">
                Kırmızı Uyarı (15&apos;ten sonra)
              </p>
              <p className="text-gray-700">
                &quot;Süre geçti! Yönetici onayı gerekiyor&quot; mesajı
              </p>
            </div>
            <div className="bg-gray-100 border-l-4 border-gray-500 p-4 rounded-r-lg">
              <p className="font-semibold text-gray-900 mb-1">
                Bloke (Belirlenen tarihten sonra)
              </p>
              <p className="text-gray-700">
                Sistem dekont yüklemeyi engelleyebilir
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 bg-white p-4 rounded-lg">
            <h3 className="font-bold text-lg text-gray-900">💡 Önemli Notlar</h3>
            <div className="flex items-start">
              <ClockIcon className="h-5 w-5 text-indigo-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700">
                <strong>Her ay, bir önceki ayın dekontunu yüklersiniz</strong>
                <br />
                <span className="text-sm">
                  Örnek: Ekim ayında → Eylül dekontu yüklenir
                </span>
              </p>
            </div>
            <div className="flex items-start">
              <PhoneIcon className="h-5 w-5 text-indigo-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700">
                <strong>Gecikme durumunda</strong>
                <br />
                <span className="text-sm">
                  Önce işletmeyi arayın, sorun varsa idareye bildirin
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Kontrol Listesi */}
        <section className="bg-white rounded-2xl shadow-lg p-8 mb-6 print:shadow-none print:mb-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            📝 Kontrol Listesi
          </h2>
          <p className="text-gray-700 mb-4">
            İlk kullanımda yapılması gerekenler:
          </p>
          <div className="space-y-2">
            {[
              "Sisteme giriş yaptım (ozdilek.kodleon.com)",
              "İlk şifremi (2025) değiştirdim",
              "Güvenli bir PIN kodu oluşturdum",
              "Öğrenci listemi kontrol ettim",
              "Dekont yükleme işlemini denedim",
              "Dekont sürelerini öğrendim",
              "Mobil cihazdan da giriş yaptım",
            ].map((item, i) => (
              <label
                key={i}
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="ml-3 text-gray-700">{item}</span>
              </label>
            ))}
          </div>
        </section>

        {/* SSS */}
        <section className="bg-white rounded-2xl shadow-lg p-8 mb-6 print:shadow-none print:mb-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            ❓ Sık Sorulan Sorular
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Şifremi unuttum, ne yapmalıyım?",
                a: "İdare ile iletişime geçin, sistem yöneticisi sıfırlayabilir.",
              },
              {
                q: "Dekont yüklenirken hata aldım?",
                a: "İnternet bağlantınızı kontrol edin, dosya boyutunun çok büyük olmadığından emin olun (max 5MB), farklı tarayıcı deneyin.",
              },
              {
                q: "Öğrenci listesinde eksik var?",
                a: "Öğrenci atamaları idare tarafından yapılır. İdare ile görüşün.",
              },
              {
                q: "Mobil cihazdan kullanılır mı?",
                a: "Evet! Telefon veya tabletten tarayıcı ile ozdilek.kodleon.com adresine girin.",
              },
            ].map((faq, i) => (
              <div key={i} className="border-l-4 border-indigo-600 pl-4">
                <h3 className="font-bold text-gray-900 mb-1">{faq.q}</h3>
                <p className="text-gray-700">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Destek */}
        <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg p-8 mb-6 print:shadow-none print:mb-4">
          <h2 className="text-3xl font-bold mb-6">📞 Destek</h2>
          <div className="space-y-3">
            <p className="font-semibold text-lg">Teknik destek için:</p>
            <div className="flex items-center">
              <EnvelopeIcon className="h-6 w-6 mr-3" />
              <span>mackaengin@gmail.com</span>
            </div>
            <div className="flex items-center">
              <PhoneIcon className="h-6 w-6 mr-3" />
              <span>05465867927 (Engin Dalga)</span>
            </div>
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 mr-3" />
              <span>Çalışma saatleri: Hafta içi 08:00-17:00</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="text-center py-8 print:py-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            ✨ Başarılı Staj Dönemi Dileriz!
          </h2>
          <p className="text-lg text-gray-600 italic mb-6">
            K-PANEL ile staj takibi artık çok daha kolay!
          </p>
          <div className="border-t border-gray-300 pt-6 mt-6">
            <p className="font-bold text-gray-900 text-lg">
              Hüsniye Özdilek Ticaret MTAL
            </p>
            <p className="text-gray-600">
              Staj Koordinatörlüğü Takip Sistemi
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Versiyon 1.0 | Eylül 2025
            </p>
            <p className="text-indigo-600 font-mono mt-3">
              ozdilek.kodleon.com
            </p>
          </div>
        </section>
      </div>

      {/* Print Button - Hidden when printing */}
      <div className="fixed bottom-6 right-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold flex items-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Yazdır
        </button>
      </div>
    </div>
  );
}
