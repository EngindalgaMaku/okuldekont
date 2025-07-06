'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'circular':
        return 'rounded-full'
      case 'rectangular':
        return 'rounded-md'
      default:
        return 'rounded-md'
    }
  }

  const getAnimationClasses = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse'
      case 'wave':
        return 'animate-wave'
      case 'none':
        return ''
      default:
        return 'animate-pulse'
    }
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`
        bg-gray-200 ${getVariantClasses()} ${getAnimationClasses()} ${className}
      `}
      style={style}
      aria-label="Yükleniyor..."
      role="status"
    />
  )
}

// Specialized skeleton components for common use cases
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2">
            <Skeleton variant="text" width={120} />
            <Skeleton variant="text" width={80} />
          </div>
        </div>
        <Skeleton variant="rectangular" width={60} height={24} />
      </div>
      <div className="space-y-3">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="75%" />
        <Skeleton variant="text" width="50%" />
      </div>
    </div>
  </div>
)

export const TableSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
    <div className="animate-pulse">
      {/* Table Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`header-${index}`} variant="text" height={16} />
          ))}
        </div>
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height={14} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const StatCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Skeleton variant="text" width={100} height={14} />
          <Skeleton variant="text" width={60} height={32} />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
      <div className="mt-4">
        <Skeleton variant="text" width={80} height={12} />
      </div>
    </div>
  </div>
)

export const FormSkeleton: React.FC<{ fields?: number; className?: string }> = ({
  fields = 3,
  className = ''
}) => (
  <div className={`space-y-6 ${className}`}>
    <div className="animate-pulse">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={`field-${index}`} className="space-y-2 mb-6">
          <Skeleton variant="text" width={120} height={16} />
          <Skeleton variant="rectangular" width="100%" height={40} />
        </div>
      ))}
      <div className="flex justify-end space-x-3 pt-4">
        <Skeleton variant="rectangular" width={80} height={40} />
        <Skeleton variant="rectangular" width={100} height={40} />
      </div>
    </div>
  </div>
)

export const ListSkeleton: React.FC<{ items?: number; className?: string }> = ({
  items = 5,
  className = ''
}) => (
  <div className={`space-y-3 ${className}`}>
    <div className="animate-pulse">
      {Array.from({ length: items }).map((_, index) => (
        <div key={`item-${index}`} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-100">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="75%" height={16} />
            <Skeleton variant="text" width="50%" height={14} />
          </div>
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  </div>
)