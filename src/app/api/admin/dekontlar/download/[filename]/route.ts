import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Admin yetkisi kontrolü
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filename } = params
    
    // Güvenlik kontrolü - sadece uploads/dekontlar klasöründeki dosyalar
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    // Dosya yolu
    const filePath = join(process.cwd(), 'public', 'uploads', 'dekontlar', filename)
    
    // Dosya varlığı kontrolü
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    try {
      // Dosyayı oku
      const fileBuffer = await readFile(filePath)
      
      // Dosya uzantısına göre MIME type belirleme
      const extension = filename.split('.').pop()?.toLowerCase()
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
      }

      // Response oluştur
      const response = new NextResponse(fileBuffer)
      
      response.headers.set('Content-Type', contentType)
      response.headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      
      return response
    } catch (fileError) {
      console.error('File reading error:', fileError)
      return NextResponse.json({ error: 'Error reading file' }, { status: 500 })
    }
  } catch (error) {
    console.error('Download API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}