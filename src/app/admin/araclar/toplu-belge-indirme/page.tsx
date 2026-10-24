import { Suspense } from 'react'
import ClientPage from './ClientPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div></div>}>
      <ClientPage />
    </Suspense>
  )
}