import { Twilio } from 'twilio'
import { SMSProvider, SMSResult } from '../types'

export class TwilioProvider implements SMSProvider {
  private client: Twilio
  private fromNumber: string

  constructor(
    accountSid: string,
    authToken: string,
    fromNumber: string
  ) {
    this.client = new Twilio(accountSid, authToken)
    this.fromNumber = fromNumber
  }

  async send(phone: string, message: string): Promise<SMSResult> {
    try {
      // Telefon numarasını formatla (Türkiye için +90 ekle)
      const formattedPhone = this.formatPhoneNumber(phone)
      
      if (!this.validatePhone(formattedPhone)) {
        return {
          success: false,
          error: 'Geçersiz telefon numarası formatı'
        }
      }

      const smsMessage = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedPhone
      })

      return {
        success: true,
        messageId: smsMessage.sid,
        status: smsMessage.status
      }
    } catch (error: any) {
      console.error('Twilio SMS gönderim hatası:', error)
      return {
        success: false,
        error: error.message || 'SMS gönderim hatası'
      }
    }
  }

  validatePhone(phone: string): boolean {
    // Türkiye telefon numarası formatları:
    // +905551234567, 905551234567, 05551234567
    const phoneRegex = /^(\+90|90|0)?5\d{9}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  private formatPhoneNumber(phone: string): string {
    // Boşlukları temizle
    const cleaned = phone.replace(/\s/g, '')
    
    // Zaten +90 ile başlıyorsa olduğu gibi döndür
    if (cleaned.startsWith('+90')) {
      return cleaned
    }
    
    // 90 ile başlıyorsa + ekle
    if (cleaned.startsWith('90')) {
      return `+${cleaned}`
    }
    
    // 0 ile başlıyorsa 0'ı çıkar ve +90 ekle
    if (cleaned.startsWith('0')) {
      return `+90${cleaned.substring(1)}`
    }
    
    // 5 ile başlıyorsa +90 ekle
    if (cleaned.startsWith('5')) {
      return `+90${cleaned}`
    }
    
    return cleaned
  }

  async getStatus(messageId: string): Promise<string> {
    try {
      const message = await this.client.messages(messageId).fetch()
      return message.status
    } catch (error) {
      console.error('Twilio mesaj durumu alınamadı:', error)
      return 'unknown'
    }
  }
}