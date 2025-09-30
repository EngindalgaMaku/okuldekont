'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function MobileDebug() {
  const [logs, setLogs] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Console.log'u yakalayıp ekrana yazdır
    const originalLog = console.log
    const originalError = console.error

    console.log = (...args: any[]) => {
      originalLog(...args)
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      setLogs(prev => [...prev.slice(-20), `[LOG] ${new Date().toLocaleTimeString()}: ${message}`])
    }

    console.error = (...args: any[]) => {
      originalError(...args)
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      setLogs(prev => [...prev.slice(-20), `[ERROR] ${new Date().toLocaleTimeString()}: ${message}`])
    }

    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 right-4 z-[9999] bg-black text-white px-3 py-2 rounded-lg text-xs"
      >
        Show Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-[9999] bg-black bg-opacity-90 text-white p-4 max-h-64 overflow-y-auto text-xs font-mono">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Mobile Debug Console</h3>
        <button onClick={() => setIsVisible(false)} className="text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        {logs.length === 0 ? (
          <p className="text-gray-400">No logs yet...</p>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className={`${log.includes('[ERROR]') ? 'text-red-400' : 'text-green-400'} break-words`}
            >
              {log}
            </div>
          ))
        )}
      </div>
      <button
        onClick={() => setLogs([])}
        className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-xs"
      >
        Clear Logs
      </button>
    </div>
  )
}
