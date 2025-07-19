import { Suspense } from 'react'
import IsletmelerServerPrisma from '@/components/admin/IsletmelerServerPrisma'
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
        <IsletmelerServerPrisma searchParams={params} />
      </Suspense>
    </div>
  )
}