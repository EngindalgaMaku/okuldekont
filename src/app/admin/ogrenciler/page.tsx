import { Suspense } from 'react'
import OgrencilerServer from '@/components/admin/OgrencilerServer'
import OgrencilerLoading from '@/components/admin/OgrencilerLoading'

type SearchParams = {
  page?: string
  search?: string
  alanId?: string
  sinif?: string
  status?: string
  per_page?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function OgrencilerPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-8">
      <Suspense fallback={<OgrencilerLoading />}>
        <OgrencilerServer searchParams={params} />
      </Suspense>
    </div>
  )
}