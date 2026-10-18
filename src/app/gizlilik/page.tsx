import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | K-Panel',
  description: 'K-Panel Koordinatörlük Takip Uygulaması gizlilik politikası ve KVKK aydınlatma metni',
}

const CONTACT_EMAIL = 'mackaengin@gmail.com'
const EFFECTIVE_DATE = '17 Ekim 2026'

async function getSchoolName() {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'school_name' } })
    return setting?.value || 'Okul'
  } catch {
    return 'Okul'
  }
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-3">{title}</h2>
      <div className="space-y-3 text-slate-700 leading-relaxed">{children}</div>
    </section>
  )
}

export default async function GizlilikPage() {
  const schoolName = await getSchoolName()

  return (
    <main className="min-h-[100dvh] bg-slate-50 py-8 px-4">
      <article className="mx-auto max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 space-y-8">
        <header className="space-y-2 border-b border-slate-200 pb-6">
          <p className="text-sm font-medium text-sky-600">K-Panel · Koordinatörlük Takip Uygulaması</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Gizlilik Politikası ve KVKK Aydınlatma Metni</h1>
          <p className="text-sm text-slate-500">Yürürlük tarihi: {EFFECTIVE_DATE}</p>
        </header>

        <p className="text-slate-700 leading-relaxed">
          Bu metin, K-Panel web uygulamasının ve Android uygulamasının (birlikte &ldquo;Uygulama&rdquo;) kişisel
          verileri nasıl işlediğini, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) kapsamında
          açıklamaktadır. Uygulama, mesleki eğitim kapsamında işletmelerde beceri eğitimi gören öğrencilerin staj ve
          ücret ödeme süreçlerinin okul tarafından takip edilmesi için kullanılır.
        </p>

        <Section title="1. Veri sorumlusu">
          <p>
            Uygulamada işlenen kişisel verilerin veri sorumlusu <strong>{schoolName} Müdürlüğü</strong>&apos;dür.
            Uygulamanın yazılım ve barındırma hizmeti, okul adına ve okulun talimatları doğrultusunda Kodleon
            tarafından sağlanır.
          </p>
        </Section>

        <Section title="2. Uygulamayı kimler kullanır?">
          <p>
            Uygulamaya yalnızca okul tarafından tanımlanan <strong>okul yöneticileri</strong>,{' '}
            <strong>koordinatör öğretmenler</strong> ve öğrencilerin eğitim gördüğü <strong>işletmeler</strong> giriş
            yapabilir. Hesaplar okul tarafından oluşturulur; uygulama üzerinden herkese açık kayıt yapılamaz.
            Öğrenciler uygulamayı kullanmaz ve uygulama 18 yaşından küçüklere yönelik değildir; öğrencilere ait veriler
            yalnızca okul ve ilgili koordinatör öğretmen ile işletme tarafından görüntülenir.
          </p>
        </Section>

        <Section title="3. İşlenen kişisel veriler">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Öğrenciler:</strong> ad, soyad, T.C. kimlik numarası, okul numarası, sınıf, alan/dal, doğum
              tarihi, cinsiyet, iletişim bilgileri, veli adı-soyadı ve telefonu, staj yapılan işletme ve staj tarihleri,
              devam bilgileri, aylık ücret tutarları ve ödeme dekontları.
            </li>
            <li>
              <strong>Koordinatör öğretmenler:</strong> ad, soyad, T.C. kimlik numarası, görev, telefon, e-posta,
              sorumlu olunan işletmeler, koordinatörlük programı, yüklenen belgeler ve sisteme iletilen talep/bildirimler
              (isteğe bağlı sesli notlar dahil).
            </li>
            <li>
              <strong>İşletmeler ve yetkilileri:</strong> işletme adı, adres, vergi numarası, banka hesap bilgisi,
              çalışan sayısı, yetkili kişi ve usta öğretici adı ile iletişim bilgileri, yüklenen dekont ve belgeler.
            </li>
            <li>
              <strong>Güvenlik kayıtları:</strong> giriş denemelerinin zamanı, sonucu, IP adresi ve tarayıcı/cihaz
              bilgisi; yapılan işlemlerin kim tarafından ve ne zaman yapıldığına dair kayıtlar.
            </li>
          </ul>
        </Section>

        <Section title="4. İşleme amaçları ve hukuki sebepler">
          <p>Kişisel veriler aşağıdaki amaçlarla işlenir:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>öğrencilerin işletmelerdeki beceri eğitimi ve staj süreçlerinin planlanması ve takibi,</li>
            <li>öğrencilere ödenen ücretlere ait dekontların toplanması, kontrolü ve raporlanması,</li>
            <li>koordinatör öğretmen görevlendirmelerinin ve görev belgelerinin yönetimi,</li>
            <li>okul, öğretmen ve işletme arasındaki bildirim ve iletişimin sağlanması,</li>
            <li>hesap güvenliğinin sağlanması ve yetkisiz erişimin önlenmesi.</li>
          </ul>
          <p>
            Bu veriler; 3308 sayılı Mesleki Eğitim Kanunu ve ilgili mevzuat kapsamında okulun yürüttüğü görevler
            nedeniyle KVKK m.5/2 uyarınca kanunlarda açıkça öngörülmesi, veri sorumlusunun hukuki yükümlülüğünü yerine
            getirmesi ve ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaati hukuki
            sebeplerine dayanılarak işlenir.
          </p>
        </Section>

        <Section title="5. Android uygulamasının eriştiği bilgiler">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Dosyalar ve kamera:</strong> yalnızca siz dekont veya belge yüklemek için bir dosya ya da fotoğraf
              seçtiğinizde, seçtiğiniz dosya sunucuya gönderilir. Uygulama arka planda dosyalarınıza veya kameranıza
              erişmez.
            </li>
            <li>
              <strong>İndirilenler:</strong> indirdiğiniz dekont ve belgeler cihazınızın &ldquo;İndirilenler&rdquo;
              klasörüne kaydedilir.
            </li>
            <li>
              Uygulama konum, rehber, mikrofon (sesli not kaydı dışında), reklam kimliği veya benzeri cihaz bilgilerini
              toplamaz. Uygulamada reklam, analiz veya kullanıcı takibi yapan üçüncü taraf araçlar bulunmaz.
            </li>
          </ul>
        </Section>

        <Section title="6. Verilerin paylaşılması ve aktarılması">
          <p>
            Kişisel veriler satılmaz, reklam veya pazarlama amacıyla kullanılmaz ve üçüncü kişilerle paylaşılmaz.
            Veriler yalnızca görevi gereği erişmesi gereken okul personeli, ilgili koordinatör öğretmen ve ilgili işletme
            tarafından, yetkileri ölçüsünde görüntülenebilir. Kanunen yetkili kamu kurum ve kuruluşlarının talebi halinde
            mevzuatın gerektirdiği ölçüde paylaşım yapılabilir.
          </p>
          <p>
            Uygulama, Avrupa Birliği&apos;nde bulunan veri merkezlerinde hizmet veren Hetzner Online GmbH&apos;nin
            sunucularında barındırılır. Barındırma hizmeti sağlayıcısı verilere yalnızca altyapı hizmeti kapsamında
            ev sahipliği yapar.
          </p>
        </Section>

        <Section title="7. Saklama süresi">
          <p>
            Veriler, ilgili eğitim-öğretim yılı süresince aktif olarak kullanılır; dönem sonunda arşivlenir ve
            mevzuatın öngördüğü saklama süreleri boyunca saklanır. Bu sürelerin sonunda veriler silinir, yok edilir veya
            anonim hale getirilir.
          </p>
        </Section>

        <Section title="8. Güvenlik">
          <p>
            Verilerin korunması için şifreli bağlantı (HTTPS), rol bazlı yetkilendirme (her kullanıcı yalnızca kendi
            yetkisindeki verilere erişebilir), hatalı giriş denemelerinde hesabın geçici olarak kilitlenmesi, işlem
            kayıtları ve düzenli yedekleme gibi teknik ve idari tedbirler uygulanır.
          </p>
        </Section>

        <Section title="9. Çerezler">
          <p>
            Uygulama yalnızca oturumunuzu açık tutmak için zorunlu oturum çerezlerini kullanır. Reklam, analiz veya
            takip amaçlı çerez kullanılmaz.
          </p>
        </Section>

        <Section id="veri-silme" title="10. Haklarınız, hesap ve veri silme">
          <p>
            KVKK m.11 uyarınca kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya
            silinmesini isteme ve diğer kanuni haklarınızı kullanma hakkına sahipsiniz.
          </p>
          <p>
            Hesaplar okul tarafından oluşturulduğundan, hesabınızın kapatılması ve verilerinizin silinmesi talepleri
            okul müdürlüğüne iletilir. Talebiniz, mevzuattan doğan saklama yükümlülükleri saklı kalmak kaydıyla en geç 30
            gün içinde sonuçlandırılır.
          </p>
          <p>
            Başvurularınızı {schoolName} Müdürlüğüne yazılı olarak
            {CONTACT_EMAIL ? (
              <>
                {' '}veya{' '}
                <a className="text-sky-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>{' '}
                adresine e-posta ile
              </>
            ) : null}{' '}
            iletebilirsiniz.
          </p>
        </Section>

        <Section title="11. Değişiklikler">
          <p>
            Bu metin gerektiğinde güncellenebilir. Güncel metin her zaman bu sayfada yayınlanır ve yürürlük tarihi
            sayfanın başında belirtilir.
          </p>
        </Section>

        <footer className="border-t border-slate-200 pt-6">
          <Link href="/" className="text-sm text-sky-600 hover:underline">
            ← Giriş sayfasına dön
          </Link>
        </footer>
      </article>
    </main>
  )
}
