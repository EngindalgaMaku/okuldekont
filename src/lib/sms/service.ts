import { prisma } from '@/lib/prisma'
import { TwilioProvider } from './providers/twilio'
import { SMSProvider, SMSResult, SMSConfig, SMSTemplate } from './types'

export class SMSService {
  private provider: SMSProvider | null = null
  private config: SMSConfig | null = null

  constructor() {
    this.initializeProvider()
  }

  private async initializeProvider() {
    try {
      // Veritabanından SMS ayarlarını al
      const settings = await prisma.sMSSettings.findFirst({
        where: { enabled: true }
      })

      if (!settings) {
        console.warn('SMS ayarları bulunamadı veya etkinleştirilmemiş')
        return
      }

      this.config = {
        provider: settings.provider,
        apiKey: settings.apiKey,
        apiSecret: settings.apiSecret,
        senderName: settings.senderName || undefined,
        enabled: settings.enabled
      }

      // Provider'ı başlat
      switch (settings.provider.toLowerCase()) {
        case 'twilio':
          this.provider = new TwilioProvider(
            settings.apiKey,
            settings.apiSecret,
            settings.senderName || ''
          )
          break
        default:
          console.error(`Desteklenmeyen SMS provider: ${settings.provider}`)
      }
    } catch (error) {
      console.error('SMS provider başlatma hatası:', error)
    }
  }

  async sendSMS(phone: string, message: string, recipientName?: string): Promise<SMSResult> {
    if (!this.provider || !this.config?.enabled) {
      return {
        success: false,
        error: 'SMS servisi etkinleştirilmemiş veya yapılandırılmamış'
      }
    }

    try {
      // SMS gönder
      const result = await this.provider.send(phone, message)

      // Veritabanına kaydet
      await prisma.sMSHistory.create({
        data: {
          recipientPhone: phone,
          recipientName: recipientName || null,
          message: message,
          status: result.success ? 'SENT' : 'FAILED',
          providerId: result.messageId || null,
          errorMessage: result.error || null,
          sentAt: result.success ? new Date() : null
        }
      })

      return result
    } catch (error: any) {
      console.error('SMS gönderim hatası:', error)
      
      // Hata durumunu da kaydet
      await prisma.sMSHistory.create({
        data: {
          recipientPhone: phone,
          recipientName: recipientName || null,
          message: message,
          status: 'FAILED',
          errorMessage: error.message || 'Bilinmeyen hata'
        }
      })

      return {
        success: false,
        error: error.message || 'SMS gönderim hatası'
      }
    }
  }

  async sendTemplate(
    templateName: string, 
    phone: string, 
    variables: Record<string, any> = {},
    recipientName?: string
  ): Promise<SMSResult> {
    try {
      // Template'i al
      const template = await prisma.sMSTemplate.findFirst({
        where: { 
          name: templateName,
          enabled: true 
        }
      })

      if (!template) {
        return {
          success: false,
          error: `SMS template bulunamadı: ${templateName}`
        }
      }

      // Template'i işle (değişkenleri yerine koy)
      const processedMessage = this.processTemplate(template.content, variables)

      // SMS gönder
      const result = await this.sendSMS(phone, processedMessage, recipientName)

      // Template ID'sini güncelle
      if (result.success) {
        await prisma.sMSHistory.updateMany({
          where: {
            recipientPhone: phone,
            message: processedMessage,
            status: 'SENT'
          },
          data: {
            templateId: template.id
          }
        })
      }

      return result
    } catch (error: any) {
      console.error('Template SMS gönderim hatası:', error)
      return {
        success: false,
        error: error.message || 'Template SMS gönderim hatası'
      }
    }
  }

  private processTemplate(content: string, variables: Record<string, any>): string {
    let processed = content

    // {variable_name} formatındaki değişkenleri değiştir
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      processed = processed.replace(regex, String(value))
    })

    return processed
  }

  async getHistory(limit: number = 50, offset: number = 0) {
    return await prisma.sMSHistory.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: {
            name: true,
            triggerEvent: true
          }
        }
      }
    })
  }

  async getTemplates() {
    return await prisma.sMSTemplate.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' }
    })
  }

  validatePhone(phone: string): boolean {
    if (!this.provider) return false
    return this.provider.validatePhone(phone)
  }

  async isEnabled(): Promise<boolean> {
    if (!this.config) {
      await this.initializeProvider()
    }
    return this.config?.enabled || false
  }
}

// Singleton instance
export const smsService = new SMSService()