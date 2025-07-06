'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="h-12 w-12 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Bir Hata Oluştu
          </h1>
          
          <p className="text-gray-600 mb-8">
            Beklenmeyen bir hata meydana geldi. Lütfen sayfayı yenilemeyi deneyin 
            veya sorun devam ederse teknik destek ile iletişime geçin.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <RefreshCw className="h-5 w-5" />
            Sayfayı Yenile
          </button>
          
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200"
          >
            <Home className="h-5 w-5" />
            Ana Sayfaya Dön
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Hata ID: {error.digest || 'Bilinmiyor'}</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-600">
              Teknik detaylar
            </summary>
            <pre className="mt-2 text-xs text-left bg-gray-100 p-2 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}