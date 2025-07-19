import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = await params;
    
    // Güvenlik kontrolü: sadece dekont dosyalarına izin ver ve desteklenen formatlara
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = allowedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    
    if (!filename.includes('dekont_') || !hasValidExtension) {
      return NextResponse.json({ error: 'Geçersiz dosya formatı' }, { status: 400 });
    }

    // Dosya yolunu oluştur
    const filePath = join(process.cwd(), 'public', 'uploads', 'dekontlar', filename);
    
    // Dosya var mı kontrol et
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
    }

    // Dosyayı oku
    const fileBuffer = await readFile(filePath);
    
    // Content-Type'ı dosya uzantısına göre belirle
    const getContentType = (filename: string): string => {
      const ext = filename.toLowerCase().split('.').pop();
      switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        default: return 'application/octet-stream';
      }
    };
    
    // Dosya response header'larını ayarla
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': getContentType(filename),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Dosya indirme hatası:', error);
    return NextResponse.json({ error: 'Dosya indirilemedi' }, { status: 500 });
  }
}