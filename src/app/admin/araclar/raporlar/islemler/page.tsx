import { Suspense } from 'react'
import ClientPage from './ClientPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Yükleniyor...</div>}>
      <ClientPage />
    </Suspense>
  )
}