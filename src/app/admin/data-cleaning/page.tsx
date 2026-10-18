"use client"

import React, { useState } from 'react'

export default function DataCleaningPage() {
  const [token, setToken] = useState('CONFIRM_DATA_CLEANING_2025')
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const log = (m: string) => setLogs((prev) => [m, ...prev])

  const call = async (path: string) => {
    const url = `/api/admin/data-cleaning${path}`
    const res = await fetch(url, { method: 'DELETE' })
    let body: any = null
    try {
      body = await res.json()
    } catch {}
    log(`${res.status} ${url} => ${JSON.stringify(body)}`)
    if (!res.ok) throw new Error(body?.error || `Hata: ${res.status}`)
    return body
  }

  const runFilesOnDisk = async () => {
    setLoading(true)
    try {
      await call(`?type=files_on_disk&confirm=${encodeURIComponent(token)}`)
      log('Disk dosyaları silindi.')
    } catch (e: any) {
      log(`Hata (files_on_disk): ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const runProductionReset = async () => {
    setLoading(true)
    try {
      await call(`?type=production_reset&confirm=${encodeURIComponent(token)}`)
      log('Veritabanı üretim temizliği tamamlandı.')
    } catch (e: any) {
      log(`Hata (production_reset): ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const runAll = async () => {
    setLoading(true)
    try {
      await runFilesOnDisk()
      await runProductionReset()
      log('Tüm işlemler bitti.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Veri Temizleme (ADMIN)</h1>

      <div className="space-y-2">
        <label className="block text-sm text-gray-600">Onay Token</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          UYARI: İşlemler geri alınamaz. Bu sayfa, admin oturumunu kullanır.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={runFilesOnDisk}
          disabled={loading}
          className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
        >
          Disk dosyalarını sil (uploads)
        </button>
        <button
          onClick={runProductionReset}
          disabled={loading}
          className="px-4 py-2 rounded bg-red-700 text-white disabled:opacity-50"
        >
          Veritabanını temizle (production_reset)
        </button>
        <button
          onClick={runAll}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          Hepsini Çalıştır
        </button>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold">Log</h2>
        <pre className="mt-2 whitespace-pre-wrap text-sm bg-gray-100 p-3 rounded min-h-[120px]">
{logs.join('\n')}
        </pre>
      </div>
    </div>
  )
}
