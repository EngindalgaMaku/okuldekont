import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    console.log('Belge download request received')
    
    const session = await getServerSession(authOptions)
    
    // Yetki kontrolü - Admin, Öğretmen veya İşletme
    if (!session || !['ADMIN', 'TEACHER', 'COMPANY'].includes(session.user.role)) {
      console.log('Unauthorized access attempt:', session?.user?.role || 'No session')
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { filename } = await params
    console.log('Requested filename:', filename)
    
    // Güvenlik kontrolü - sadece uploads/belgeler klasöründeki dosyalar
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.log('Invalid filename detected:', filename)
      return NextResponse.json({ error: 'Geçersiz dosya adı' }, { status: 400 })
    }

    // URL decode filename to handle Turkish characters and special characters
    const decodedFilename = decodeURIComponent(filename)
    console.log('Decoded filename:', decodedFilename)

    // Dosya yolu
    const filePath = join(process.cwd(), 'public', 'uploads', 'belgeler', decodedFilename)
    console.log('Full file path:', filePath)
    
    // Dosya varlığı kontrolü
    if (!existsSync(filePath)) {
      console.log('File not found at path:', filePath)
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 })
    }

    try {
      console.log('Reading file...')
      // Dosyayı oku
      const fileBuffer = await readFile(filePath)
      console.log('File read successfully, size:', fileBuffer.length, 'bytes')
      
      // Dosya uzantısına göre MIME type belirleme
      const extension = decodedFilename.split('.').pop()?.toLowerCase()
      let contentType = 'application/octet-stream'
      
      switch (extension) {
        case 'pdf':
          contentType = 'application/pdf'
          break
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg'
          break
        case 'png':
          contentType = 'image/png'
          break
        case 'doc':
          contentType = 'application/msword'
          break
        case 'docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          break
        case 'xls':
          contentType = 'application/vnd.ms-excel'
          break
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        case 'txt':
          contentType = 'text/plain; charset=utf-8'
          break
      }
      
      console.log('Content type determined:', contentType)

      // Response oluştur
      const response = new NextResponse(fileBuffer)
      
      // Get original filename from the encoded filename for proper download name
      const originalFilename = decodedFilename.replace(/^\d+_/, '') // Remove timestamp prefix if exists
      
      response.headers.set('Content-Type', contentType)
      response.headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalFilename)}`)
      response.headers.set('Content-Length', fileBuffer.length.toString())
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      
      console.log('Response headers set, sending file')
      return response
    } catch (fileError) {
      console.error('File reading error:', fileError)
      return NextResponse.json({ error: 'Dosya okunurken hata oluştu: ' + (fileError as Error).message }, { status: 500 })
    }
  } catch (error) {
    console.error('Download API error:', error)
    return NextResponse.json({ error: 'Sunucu hatası: ' + (error as Error).message }, { status: 500 })
  }
}