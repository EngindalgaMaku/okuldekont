-- Create message templates table
CREATE TABLE IF NOT EXISTS mesaj_sablonlari (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'Genel',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies
ALTER TABLE mesaj_sablonlari ENABLE ROW LEVEL SECURITY;

-- Policy for admins to read all templates
CREATE POLICY "Admin can read message templates" ON mesaj_sablonlari
    FOR SELECT USING (TRUE);

-- Policy for admins to insert templates
CREATE POLICY "Admin can insert message templates" ON mesaj_sablonlari
    FOR INSERT WITH CHECK (TRUE);

-- Policy for admins to update templates
CREATE POLICY "Admin can update message templates" ON mesaj_sablonlari
    FOR UPDATE USING (TRUE);

-- Policy for admins to delete templates
CREATE POLICY "Admin can delete message templates" ON mesaj_sablonlari
    FOR DELETE USING (TRUE);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mesaj_sablonlari_updated_at
    BEFORE UPDATE ON mesaj_sablonlari
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some default templates
INSERT INTO mesaj_sablonlari (title, content, category) VALUES
('Staj Başlangıç Bildirgesi', 'Sayın İşletme Yetkilisi,

{öğrenci_adı} adlı öğrencimizin {tarih} tarihinde işletmenizde stajına başlayacağını bildiririz. 

Öğrencimizin staj süreci boyunca sizlerle koordinasyon halinde olacağız.

Saygılarımızla,
Okul İdaresi', 'Staj İşlemleri'),

('Dekont Hatırlatması', 'Sayın İşletme Yetkilisi,

{ay} ayı dekont belgelerinin {tarih} tarihine kadar sisteme yüklenmesi gerekmektedir.

Geciken dekontlar için devlet katkı payı alamayabilirsiniz.

Lütfen dekontlarınızı zamanında yükleyiniz.

Saygılarımızla,
Okul İdaresi', 'Dekont İşlemleri'),

('Belge Eksikliği Bildirimi', 'Sayın İşletme Yetkilisi,

İşletmeniz için aşağıdaki belgeler eksik görünmektedir:
- {eksik_belgeler}

Lütfen belgeleri en kısa sürede sisteme yükleyiniz.

Saygılarımızla,
Okul İdaresi', 'Belge İşlemleri'),

('Genel Bilgilendirme', 'Sayın İşletme Yetkilisi,

{konu} hakkında bilgilendirme yapmak istiyoruz.

{detay_bilgi}

Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.

Saygılarımızla,
Okul İdaresi', 'Genel'),

('Toplantı Daveti', 'Sayın İşletme Yetkilisi,

{tarih} tarihinde saat {saat} da okulumuzda gerçekleştirilecek {toplanti_konusu} toplantısına davetlisiniz.

Toplantı Yeri: {yer}
Toplantı Konusu: {konu}

Katılımınızı rica ederiz.

Saygılarımızla,
Okul İdaresi', 'Toplantı');