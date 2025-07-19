'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, RefreshCw, Settings } from 'lucide-react'

interface DataIntegrityIssue {
  type: string
  severity: 'high' | 'medium' | 'low'
  description: string
  affectedRecords: number
  fixable: boolean
}

export default function DataIntegrityChecker() {
  const [issues, setIssues] = useState<DataIntegrityIssue[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkDataIntegrity = async () => {
    setIsChecking(true)

    try {
      const response = await fetch('/api/admin/data-integrity')
      
      if (!response.ok) {
        throw new Error('Veri bütünlüğü kontrolü sırasında hata oluştu')
      }

      const data = await response.json()
      setIssues(data.issues || [])
      setLastChecked(new Date(data.checkedAt))
    } catch (error) {
      console.error('Veri bütünlüğü kontrolü hatası:', error)
      setIssues([])
      setLastChecked(new Date())
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkDataIntegrity()
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'low':
        return <AlertTriangle className="w-4 h-4 text-blue-500" />
      default:
        return <Settings className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Veri Bütünlüğü Kontrolü</h3>
        </div>
        <button
          onClick={checkDataIntegrity}
          disabled={isChecking}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            isChecking
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Kontrol Ediliyor...' : 'Yeniden Kontrol Et'}
        </button>
      </div>

      {lastChecked && (
        <p className="text-sm text-gray-500 mb-4">
          Son kontrol: {lastChecked.toLocaleString('tr-TR')}
        </p>
      )}

      {issues.length === 0 ? (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-700 font-medium">Veri bütünlüğü sounu bulunamadı</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">
              {issues.length} veri bütünlüğü sorunu tespit edildi
            </span>
          </div>

          {issues.map((issue, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}
            >
              <div className="flex items-start gap-2">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{issue.description}</p>
                    <span className="text-xs bg-white/50 px-2 py-1 rounded">
                      {issue.affectedRecords} kayıt
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      issue.severity === 'high' ? 'bg-red-100 text-red-700' :
                      issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {issue.severity === 'high' ? 'Yüksek' : 
                       issue.severity === 'medium' ? 'Orta' : 'Düşük'} Öncelik
                    </span>
                    {issue.fixable && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        Otomatik düzeltilebilir
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Önemli:</strong> Bu sorunları düzeltmek için{' '}
              <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">
                node scripts/fix-data-inconsistencies.js
              </code>{' '}
              scriptini çalıştırabilirsiniz.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}