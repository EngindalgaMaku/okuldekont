import { NextRequest, NextResponse } from 'next/server'
import { createCanvas, loadImage, registerFont } from 'canvas'
import sharp from 'sharp'
import { validateAuthAndRole } from '@/middleware/auth'
import { processDocumentForOCR, extractStructuredData } from '@/lib/ocr-service'
import { analyzeWithAI } from '@/lib/ai-analysis-service'
import fs from 'fs/promises'
import path from 'path'

// Register a font for more realistic text
try {
    registerFont(path.join(process.cwd(), 'public', 'fonts', 'cour.ttf'), { family: 'Courier New' });
} catch (error) {
    console.warn("Could not register font. Using system default.", error);
}


// Helper to calculate similarity
function calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    const lowerStr1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const lowerStr2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const longer = lowerStr1.length > lowerStr2.length ? lowerStr1 : lowerStr2;
    const shorter = lowerStr1.length > lowerStr2.length ? lowerStr2 : lowerStr1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = (s1: string, s2: string) => {
      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i == 0) {
            costs[j] = j;
          } else {
            if (j > 0) {
              let newValue = costs[j - 1];
              if (s1.charAt(i - 1) != s2.charAt(j - 1)) {
                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
              }
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0) {
          costs[s2.length] = lastValue;
        }
      }
      return costs[s2.length];
    }
  
    return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length.toString());
}

export async function POST(request: NextRequest) {
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { dekontData, zorluk } = await request.json()

    // 1. Load the base dekont template
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'dekont_sablon.png');
    
    try {
        await fs.access(templatePath);
    } catch (error) {
        console.error('Dekont template file not found:', templatePath);
        return NextResponse.json({ error: 'Dekont şablon dosyası bulunamadı. Lütfen `public/templates/dekont_sablon.png` dosyasını kontrol edin.' }, { status: 500 });
    }

    const templateImage = await loadImage(templatePath);
    const canvas = createCanvas(templateImage.width, templateImage.height);
    const ctx = canvas.getContext('2d');

    // 2. Draw template and text using Canvas
    ctx.drawImage(templateImage, 0, 0);
    
    ctx.fillStyle = '#000000'; // Pure black for max contrast
    ctx.font = 'bold 28px "Courier New"';
    
    ctx.fillText(dekontData.gonderen, 350, 210 + 28);
    ctx.fillText(dekontData.iban, 350, 265 + 28);
    ctx.fillText(dekontData.tarih, 350, 320 + 28);
    ctx.fillText(dekontData.aciklama, 350, 375 + 28);

    ctx.fillStyle = '#D9534F';
    ctx.font = 'bold 42px "Courier New"';
    ctx.fillText(`${dekontData.tutar} TL`, 350, 450 + 42);

    const canvasBuffer = canvas.toBuffer('image/png');

    // 3. Apply effects using Sharp
    let image = sharp(canvasBuffer);

    if (zorluk.bulaniklik > 0) {
        image = image.blur(zorluk.bulaniklik);
    }
    if (zorluk.egiklik !== 0) {
        image = image.rotate(zorluk.egiklik, { background: { r: 255, g: 255, b: 255, alpha: 1 } });
    }
    if (zorluk.kontrast !== 1) {
        image = image.linear(zorluk.kontrast, -(128 * zorluk.kontrast) + 128);
    }

    const finalBuffer = await image.jpeg({ quality: 90 - (zorluk.gurultu * 5) }).toBuffer();

    // 4. Save the image temporarily
    const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp_dekonts');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFileName = `test_${Date.now()}.jpeg`;
    const tempFilePath = path.join(tempDir, tempFileName);
    await fs.writeFile(tempFilePath, finalBuffer);
    
    const fileUrl = `/uploads/temp_dekonts/${tempFileName}`;

    // 5. Run Analysis
    const ocrResult = await processDocumentForOCR(finalBuffer, tempFileName)
    const extractedData = extractStructuredData(ocrResult, dekontData)
    const aiAnalysis = await analyzeWithAI(ocrResult.text, dekontData)
    
    // 6. Calculate transparent scoring
    const basariOranlari = {
      tutar: calculateSimilarity(dekontData.tutar, extractedData.amount || ''),
      tarih: calculateSimilarity(dekontData.tarih, extractedData.date || ''),
      gonderen: calculateSimilarity(dekontData.gonderen, extractedData.senderName || ''),
      iban: calculateSimilarity(dekontData.iban, extractedData.iban || ''),
      aciklama: calculateSimilarity(dekontData.aciklama, extractedData.description || ''),
    }

    const ocrScore = (ocrResult.confidence / 100) * 0.3;
    const aiScore = aiAnalysis.overallReliability * 0.3;
    const matchScore = Object.values(basariOranlari).reduce((sum, score) => sum + score, 0) / Object.keys(basariOranlari).length * 0.4;
    
    const overallReliability = (!ocrResult.text || ocrResult.text.trim() === '') ? 0 : ocrScore + aiScore + matchScore;

    const skorDetaylari = {
        ocrGuvenilirligi: ocrScore,
        aiTutarliligi: aiScore,
        veriUyumu: matchScore,
        toplam: overallReliability
    }

    const sonuc = {
      beklenen: dekontData,
      tespitEdilen: {
        tutar: extractedData.amount,
        tarih: extractedData.date,
        gonderen: extractedData.senderName,
        iban: extractedData.iban,
        aciklama: extractedData.description,
      },
      guvenilirlik: overallReliability,
      basariOranlari,
      skorDetaylari,
      gorselUrl: fileUrl,
    }

    return NextResponse.json(sonuc)

  } catch (error: any) {
    console.error('Dekont test run error:', error)
    return NextResponse.json({ error: 'Test sırasında bir hata oluştu.', details: error.message }, { status: 500 })
  }
}