import { Suspense } from 'react'
import OgretmenlerServer from '@/components/admin/OgretmenlerServer'
import OgretmenlerLoading from '@/components/admin/OgretmenlerLoading'

type SearchParams = {
  page?: string
  search?: string
  alan?: string
  per_page?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function OgretmenYonetimiPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <Suspense fallback={<OgretmenlerLoading />}>
        <OgretmenlerServer searchParams={params} />
      </Suspense>
    </div>
  )
}