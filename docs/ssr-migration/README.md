# Supabase SSR Geçiş Dokümantasyonu

Bu dizin, projenin İstemci Tarafı Oluşturma (Client-Side Rendering - CSR) yapısından Sunucu Tarafı Oluşturma (Server-Side Rendering - SSR) yapısına geçiş sürecini belgelemek için oluşturulmuştur.

Her bir sayfa veya bileşen için aşağıdaki adımlar izlenecektir:

1.  **Analiz:** Mevcut sayfanın kod yapısı, state yönetimi, veri çekme mantığı ve kullanıcı etkileşimleri detaylı bir şekilde analiz edilecek ve kendi `.md` dosyasına kaydedilecektir.
2.  **Planlama:** Analiz sonuçlarına göre, SSR geçişi için bir eylem planı oluşturulacaktır. Bu plan, hangi kodun sunucuya, hangisinin istemciye taşınacağını ve veri akışının nasıl sağlanacağını net bir şekilde belirtecektir.
3.  **Uygulama:** Onay alındıktan sonra, planlanan değişiklikler dikkatli bir şekilde kodda uygulanacaktır.
4.  **Test ve Doğrulama:** Değişikliklerin ardından sayfanın tüm fonksiyonlarının doğru çalıştığı ve performans iyileşmesinin sağlandığı teyit edilecektir.

Bu metodoloji, geçiş sürecinin şeffaf, kontrol edilebilir ve hatasız olmasını sağlamayı hedefler.