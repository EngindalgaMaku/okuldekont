import { Suspense } from 'react'
import IsletmelerServer from '@/components/admin/IsletmelerServer'
import IsletmelerLoading from '@/components/admin/IsletmelerLoading'

type SearchParams = {
  page?: string
  search?: string
  filter?: string
  per_page?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function IsletmeYonetimiPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<IsletmelerLoading />}>
        <IsletmelerServer searchParams={params} />
      </Suspense>
    </div>
  )
}