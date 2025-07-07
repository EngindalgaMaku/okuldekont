-- OCR verilerini saklamak için yeni kolonlar ekle
ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(5,2);
ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS ocr_raw_text TEXT;
ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS ocr_validation_warnings TEXT[];
ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS ocr_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- OCR verileri için index ekle
CREATE INDEX IF NOT EXISTS idx_dekontlar_ocr_confidence ON dekontlar(ocr_confidence);
CREATE INDEX IF NOT EXISTS idx_dekontlar_ocr_created_at ON dekontlar(ocr_created_at);

-- OCR verilerini görüntülemek için view güncelle
CREATE OR REPLACE VIEW dekontlar_with_ocr AS
SELECT 
    d.*,
    CASE 
        WHEN d.ocr_confidence IS NOT NULL THEN 
            CASE 
                WHEN d.ocr_confidence >= 80 THEN 'Yüksek'
                WHEN d.ocr_confidence >= 60 THEN 'Orta'
                ELSE 'Düşük'
            END
        ELSE 'OCR Yok'
    END as ocr_confidence_level,
    CASE 
        WHEN d.ocr_confidence IS NOT NULL THEN 'Otomatik'
        ELSE 'Manuel'
    END as entry_type
FROM dekontlar d;

-- OCR istatistikleri için fonksiyon
CREATE OR REPLACE FUNCTION get_ocr_statistics()
RETURNS TABLE (
    total_dekontlar INTEGER,
    ocr_processed INTEGER,
    high_confidence INTEGER,
    medium_confidence INTEGER,
    low_confidence INTEGER,
    average_confidence DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_dekontlar,
        COUNT(CASE WHEN ocr_confidence IS NOT NULL THEN 1 END)::INTEGER as ocr_processed,
        COUNT(CASE WHEN ocr_confidence >= 80 THEN 1 END)::INTEGER as high_confidence,
        COUNT(CASE WHEN ocr_confidence >= 60 AND ocr_confidence < 80 THEN 1 END)::INTEGER as medium_confidence,
        COUNT(CASE WHEN ocr_confidence < 60 THEN 1 END)::INTEGER as low_confidence,
        AVG(ocr_confidence)::DECIMAL(5,2) as average_confidence
    FROM dekontlar;
END;
$$ LANGUAGE plpgsql;