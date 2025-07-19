'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex justify-center items-center space-x-2 mt-6 py-4">
      <Link
        href={createPageURL(currentPage - 1)}
        className={`p-2 rounded-md ${currentPage === 1 ? 'pointer-events-none text-gray-400 bg-gray-100' : 'hover:bg-gray-200'}`}
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>

      <span className="text-sm text-gray-700">
        Sayfa {currentPage} / {totalPages}
      </span>

      <Link
        href={createPageURL(currentPage + 1)}
        className={`p-2 rounded-md ${currentPage >= totalPages ? 'pointer-events-none text-gray-400 bg-gray-100' : 'hover:bg-gray-200'}`}
        aria-disabled={currentPage >= totalPages}
        tabIndex={currentPage >= totalPages ? -1 : undefined}
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  )
}