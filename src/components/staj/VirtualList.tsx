'use client'

import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
}

function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const { visibleRange, totalHeight, offsetY } = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(startIndex + visibleCount + overscan, items.length)
    const safeStartIndex = Math.max(0, startIndex - overscan)

    return {
      visibleRange: { start: safeStartIndex, end: endIndex },
      totalHeight: items.length * itemHeight,
      offsetY: safeStartIndex * itemHeight
    }
  }, [scrollTop, items.length, itemHeight, containerHeight, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end)
  }, [items, visibleRange.start, visibleRange.end])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return (
    <div
      ref={scrollElementRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: 'auto'
      }}
      className="virtual-scroll-container"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index
            return (
              <div
                key={actualIndex}
                style={{ height: itemHeight }}
                className="virtual-item"
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default memo(VirtualList) as typeof VirtualList