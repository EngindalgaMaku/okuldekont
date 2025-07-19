// Performance monitoring utilities
export class QueryPerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()
  
  static async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await queryFn()
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Store performance metrics
      if (!this.metrics.has(queryName)) {
        this.metrics.set(queryName, [])
      }
      this.metrics.get(queryName)!.push(duration)
      
      // Log slow queries (>1000ms)
      if (duration > 1000) {
        console.warn(`🐌 Slow Query Detected: ${queryName} took ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      console.error(`❌ Query Error: ${queryName}`, error)
      throw error
    }
  }
  
  static getMetrics() {
    const report: Record<string, any> = {}
    
    this.metrics.forEach((times, queryName) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const max = Math.max(...times)
      const min = Math.min(...times)
      
      report[queryName] = {
        count: times.length,
        average: Math.round(avg),
        max: Math.round(max),
        min: Math.round(min),
        slowQueries: times.filter(t => t > 1000).length
      }
    })
    
    return report
  }
  
  static clearMetrics() {
    this.metrics.clear()
  }
}

// Cache utilities for frequently accessed data
export class QueryCache {
  private static cache: Map<string, { data: any; expiry: number }> = new Map()
  private static defaultTTL = 5 * 60 * 1000 // 5 minutes
  
  static async get<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(key)
    
    if (cached && cached.expiry > now) {
      return cached.data
    }
    
    const data = await queryFn()
    this.cache.set(key, {
      data,
      expiry: now + ttl
    })
    
    return data
  }
  
  static invalidate(pattern: string) {
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    })
  }
  
  static clear() {
    this.cache.clear()
  }
}

// Batched query utilities
export class BatchQueryManager {
  private static batches: Map<string, any[]> = new Map()
  private static timers: Map<string, NodeJS.Timeout> = new Map()
  
  static async batchQuery<T, R>(
    batchKey: string,
    item: T,
    batchFn: (items: T[]) => Promise<R[]>,
    delay: number = 50
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      // Add item to batch
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, [])
      }
      
      const batch = this.batches.get(batchKey)!
      const itemIndex = batch.length
      batch.push({ item, resolve, reject })
      
      // Clear existing timer
      const existingTimer = this.timers.get(batchKey)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }
      
      // Set new timer
      const timer = setTimeout(async () => {
        const currentBatch = this.batches.get(batchKey) || []
        this.batches.delete(batchKey)
        this.timers.delete(batchKey)
        
        if (currentBatch.length === 0) return
        
        try {
          const items = currentBatch.map(b => b.item)
          const results = await batchFn(items)
          
          currentBatch.forEach((batchItem, index) => {
            batchItem.resolve(results[index])
          })
        } catch (error) {
          currentBatch.forEach(batchItem => {
            batchItem.reject(error)
          })
        }
      }, delay)
      
      this.timers.set(batchKey, timer)
    })
  }
}