import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TwilioProvider } from '@/lib/sms/providers/twilio'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { phone, message, twilioAccountSid, twilioAuthToken, twilioFromNumber } = await request.json()

    if (!phone || !message) {
      return NextResponse.json({ error: 'Telefon numarası ve mesaj gerekli' }, { status: 400 })
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      return NextResponse.json({ 
        error: 'Twilio konfigürasyonu eksik (Account SID, Auth Token, From Number gerekli)' 
      }, { status: 400 })
    }

    // Twilio provider oluştur
    const twilioProvider = new TwilioProvider(
      twilioAccountSid,
      twilioAuthToken,
      twilioFromNumber
    )

    // Telefon numarasını doğrula
    if (!twilioProvider.validatePhone(phone)) {
      return NextResponse.json({ 
        error: 'Geçersiz telefon numarası formatı. Türkiye formatında olmalı (örn: 05551234567)' 
      }, { status: 400 })
    }

    // SMS gönder
    const result = await twilioProvider.send(phone, message)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'SMS başarıyla gönderildi',
        messageId: result.messageId,
        status: result.status
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('SMS test hatası:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'SMS gönderim hatası'
    }, { status: 500 })
  }
}