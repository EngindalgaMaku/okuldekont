'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

interface DatabaseStatusProps {
  className?: string
  showText?: boolean
}

export default function DatabaseStatus({ className = '', showText = true }: DatabaseStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [latency, setLatency] = useState<number | null>(null)

  const checkDatabaseConnection = async () => {
    try {
      const startTime = performance.now()
      
      // Use the new health check API endpoint
      const response = await fetch('/api/health/database')
      const endTime = performance.now()
      const responseTime = Math.round(endTime - startTime)
      
      if (response.ok) {
        const data = await response.json()
        setStatus('connected')
        setLatency(data.latency || responseTime)
      } else {
        console.warn('Database health check failed:', response.status)
        setStatus('disconnected')
        setLatency(null)
      }
    } catch (error) {
      console.error('Database connection error:', error)
      setStatus('disconnected')
      setLatency(null)
    }
  }

  useEffect(() => {
    checkDatabaseConnection()
    
    // Recheck every 30 seconds
    const interval = setInterval(checkDatabaseConnection, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600'
      case 'disconnected':
        return 'text-red-600'
      case 'checking':
        return 'text-yellow-600'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return latency ? `Bağlı (${latency}ms)` : 'Bağlı'
      case 'disconnected':
        return 'Bağlantısız'
      case 'checking':
        return 'Kontrol ediliyor...'
      default:
        return 'Bilinmiyor'
    }
  }

  const getIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />
      case 'disconnected':
        return <WifiOff className="w-4 h-4" />
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin" />
      default:
        return <WifiOff className="w-4 h-4" />
    }
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={getStatusColor()}>
        {getIcon()}
      </div>
      {showText && (
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      )}
    </div>
  )
}

// Minimal version for corner display
export function DatabaseStatusIndicator() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
        <DatabaseStatus showText={false} className="text-xs" />
      </div>
    </div>
  )
}

// Header version for login pages
export function DatabaseStatusHeader() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health/database')
        setStatus(response.ok ? 'connected' : 'disconnected')
      } catch {
        setStatus('disconnected')
      }
    }

    checkConnection()
  }, [])

  return (
    <div className="flex items-center justify-center mb-4">
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
        status === 'connected' 
          ? 'bg-green-50 text-green-700 border border-green-200' 
          : status === 'disconnected'
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      }`}>
        {status === 'connected' && <Wifi className="w-3 h-3" />}
        {status === 'disconnected' && <WifiOff className="w-3 h-3" />}
        {status === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
        <span>
          {status === 'connected' && 'Veritabanı Bağlı'}
          {status === 'disconnected' && 'Veritabanı Bağlantısız'}
          {status === 'checking' && 'Bağlantı Kontrol Ediliyor'}
        </span>
      </div>
    </div>
  )
}