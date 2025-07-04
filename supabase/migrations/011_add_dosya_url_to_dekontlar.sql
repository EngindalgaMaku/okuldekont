-- Dekontlar tablosuna dosya_url kolonu ekle
ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS dosya_url TEXT;

-- Storage bucket oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('belgeler', 'belgeler', true, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

-- Storage için RLS politikaları
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'belgeler');

CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'belgeler');

CREATE POLICY "Allow users to update their own files" ON storage.objects
FOR UPDATE USING (bucket_id = 'belgeler');

CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (bucket_id = 'belgeler'); 