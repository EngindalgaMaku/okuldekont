export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
  status?: string
}

export interface SMSProvider {
  send(phone: string, message: string): Promise<SMSResult>
  validatePhone(phone: string): boolean
  getStatus(messageId: string): Promise<string>
}

export interface SMSTemplate {
  id: string
  name: string
  content: string
  variables?: Record<string, any>
  triggerEvent: string
  enabled: boolean
}

export interface SMSConfig {
  provider: string
  apiKey: string
  apiSecret: string
  senderName?: string
  enabled: boolean
}

export type SMSStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED' | 'UNDELIVERED'

export interface SMSHistoryRecord {
  id: string
  templateId?: string
  recipientPhone: string
  recipientName?: string
  message: string
  status: SMSStatus
  providerId?: string
  errorMessage?: string
  createdAt: Date
  sentAt?: Date
}