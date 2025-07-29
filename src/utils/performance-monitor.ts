// Performance monitoring utility for login optimizations
// Use this to measure the impact of optimizations

export interface PerformanceMetrics {
  loginTime: number
  dbQueries: number
  authTime: number
  searchTime: number
  totalTime: number
  timestamp: string
}

export class PerformanceMonitor {
  private startTime: number = 0
  private metrics: Partial<PerformanceMetrics> = {}

  start() {
    this.startTime = performance.now()
    this.metrics = {
      timestamp: new Date().toISOString()
    }
  }

  markLoginStart() {
    this.metrics.loginTime = performance.now()
  }

  markAuthComplete() {
    if (this.metrics.loginTime) {
      this.metrics.authTime = performance.now() - this.metrics.loginTime
    }
  }

  markSearchStart() {
    this.metrics.searchTime = performance.now()
  }

  markSearchComplete() {
    if (this.metrics.searchTime) {
      this.metrics.searchTime = performance.now() - this.metrics.searchTime
    }
  }

  finish(): PerformanceMetrics {
    this.metrics.totalTime = performance.now() - this.startTime
    
    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚀 Performance Metrics (Optimized)')
      console.log('Total Time:', this.metrics.totalTime?.toFixed(2), 'ms')
      console.log('Auth Time:', this.metrics.authTime?.toFixed(2), 'ms')
      console.log('Search Time:', this.metrics.searchTime?.toFixed(2), 'ms')
      console.groupEnd()
    }

    return this.metrics as PerformanceMetrics
  }

  // Static method to compare before/after optimization
  static comparePerformance(before: PerformanceMetrics, after: PerformanceMetrics) {
    const improvement = {
      totalTime: ((before.totalTime - after.totalTime) / before.totalTime) * 100,
      authTime: before.authTime && after.authTime ? 
        ((before.authTime - after.authTime) / before.authTime) * 100 : 0,
      searchTime: before.searchTime && after.searchTime ? 
        ((before.searchTime - after.searchTime) / before.searchTime) * 100 : 0
    }

    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Performance Comparison')
      console.log('Total Time Improvement:', improvement.totalTime.toFixed(1), '%')
      console.log('Auth Time Improvement:', improvement.authTime.toFixed(1), '%')
      console.log('Search Time Improvement:', improvement.searchTime.toFixed(1), '%')
      console.groupEnd()
    }

    return improvement
  }
}

// Usage example in login components:
// const monitor = new PerformanceMonitor()
// monitor.start()
// monitor.markLoginStart()
// // ... auth logic
// monitor.markAuthComplete()
// const metrics = monitor.finish()