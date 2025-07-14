'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, RefreshCw, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
    const foundIssues: DataIntegrityIssue[] = []

    try {
      // 1. Koordinatör referansları kontrolü
      const { data: isletmeler } = await supabase
        .from('isletmeler')
        .select('id, ad, koordinator_id')
        .not('koordinator_id', 'is', null)

      if (isletmeler) {
        let missingCoordinators = 0
        let inactiveCoordinators = 0

        for (const isletme of isletmeler) {
          const { data: teacher } = await supabase
            .from('ogretmenler')
            .select('id, ad, soyad, aktif')
            .eq('id', isletme.koordinator_id)
            .single()

          if (!teacher) {
            missingCoordinators++
          } else if (!teacher.aktif) {
            inactiveCoordinators++
          }
        }

        if (missingCoordinators > 0) {
          foundIssues.push({
            type: 'MISSING_COORDINATORS',
            severity: 'high',
            description: `${missingCoordinators} işletmede tanımlı koordinatör öğretmen tablosunda bulunamadı`,
            affectedRecords: missingCoordinators,
            fixable: true
          })
        }

        if (inactiveCoordinators > 0) {
          foundIssues.push({
            type: 'INACTIVE_COORDINATORS',
            severity: 'medium',
            description: `${inactiveCoordinators} işletmede pasif öğretmen koordinatör olarak tanımlı`,
            affectedRecords: inactiveCoordinators,
            fixable: true
          })
        }
      }

      // 2. Staj-öğretmen referansları kontrolü
      const { data: stajlar } = await supabase
        .from('stajlar')
        .select('id, ogretmen_id')
        .not('ogretmen_id', 'is', null)
        .eq('durum', 'aktif')

      if (stajlar) {
        const teacherIds = Array.from(new Set(stajlar.map(s => s.ogretmen_id)))
        let missingTeachers = 0
        let inactiveTeachers = 0

        for (const teacherId of teacherIds) {
          const { data: teacher } = await supabase
            .from('ogretmenler')
            .select('id, ad, soyad, aktif')
            .eq('id', teacherId)
            .single()

          if (!teacher) {
            const affectedStajlar = stajlar.filter(s => s.ogretmen_id === teacherId)
            missingTeachers += affectedStajlar.length
          } else if (!teacher.aktif) {
            const affectedStajlar = stajlar.filter(s => s.ogretmen_id === teacherId)
            inactiveTeachers += affectedStajlar.length
          }
        }

        if (missingTeachers > 0) {
          foundIssues.push({
            type: 'MISSING_TEACHERS_IN_STAJ',
            severity: 'high',
            description: `${missingTeachers} staj kaydında tanımlı öğretmen bulunamadı`,
            affectedRecords: missingTeachers,
            fixable: true
          })
        }

        if (inactiveTeachers > 0) {
          foundIssues.push({
            type: 'INACTIVE_TEACHERS_IN_STAJ',
            severity: 'medium',
            description: `${inactiveTeachers} staj kaydında pasif öğretmen tanımlı`,
            affectedRecords: inactiveTeachers,
            fixable: true
          })
        }
      }

      // 3. Orphaned öğrenciler
      const { data: stajlarWithStudents } = await supabase
        .from('stajlar')
        .select('id, ogrenci_id')
        .eq('durum', 'aktif')

      if (stajlarWithStudents) {
        let orphanedStudents = 0

        for (const staj of stajlarWithStudents) {
          const { data: student } = await supabase
            .from('ogrenciler')
            .select('id')
            .eq('id', staj.ogrenci_id)
            .single()

          if (!student) {
            orphanedStudents++
          }
        }

        if (orphanedStudents > 0) {
          foundIssues.push({
            type: 'ORPHANED_STUDENTS',
            severity: 'high',
            description: `${orphanedStudents} staj kaydında öğrenci bulunamadı`,
            affectedRecords: orphanedStudents,
            fixable: true
          })
        }
      }

      setIssues(foundIssues)
      setLastChecked(new Date())
    } catch (error) {
      console.error('Veri bütünlüğü kontrolü hatası:', error)
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