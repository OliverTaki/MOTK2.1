import { Request, Response, NextFunction } from 'express';

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
}

/**
 * Performance monitoring service for tracking API performance and system metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private systemStartTime: Date;
  private totalRequests: number = 0;
  private totalErrors: number = 0;
  private activeConnections: number = 0;
  private maxMetricsHistory: number = 1000;

  constructor() {
    this.systemStartTime = new Date();
    
    // Start periodic cleanup
    setInterval(() => this.cleanupOldMetrics(), 60000); // Every minute
  }

  /**
   * Express middleware for performance monitoring
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const startCpuUsage = process.cpuUsage();
      
      this.activeConnections++;
      this.totalRequests++;

      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const endCpuUsage = process.cpuUsage(startCpuUsage);

        // Record metrics
        const metric: PerformanceMetrics = {
          endpoint: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          timestamp: new Date(),
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
          memoryUsage: process.memoryUsage(),
          cpuUsage: endCpuUsage
        };

        // Track errors
        if (res.statusCode >= 400) {
          this.totalErrors++;
        }

        this.activeConnections--;
        this.recordMetric(metric);

        // Call original end method
        originalEnd.apply(this, args);
      }.bind(this);

      next();
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics to prevent memory issues
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const now = Date.now();
    const uptime = (now - this.systemStartTime.getTime()) / 1000; // seconds
    
    // Calculate average response time from recent metrics
    const recentMetrics = this.metrics.slice(-100); // Last 100 requests
    const averageResponseTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
      : 0;

    // Calculate error rate
    const errorRate = this.totalRequests > 0 
      ? (this.totalErrors / this.totalRequests) * 100
      : 0;

    return {
      uptime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: this.activeConnections,
      totalRequests: this.totalRequests,
      errorRate,
      averageResponseTime
    };
  }

  /**
   * Get performance metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint: string, method?: string): PerformanceMetrics[] {
    return this.metrics.filter(m => {
      const endpointMatch = m.endpoint === endpoint || m.endpoint.includes(endpoint);
      const methodMatch = !method || m.method === method;
      return endpointMatch && methodMatch;
    });
  }

  /**
   * Get performance summary for the last N minutes
   */
  getPerformanceSummary(minutes: number = 5): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowestEndpoints: Array<{ endpoint: string; method: string; averageTime: number; count: number }>;
    statusCodeDistribution: Record<string, number>;
  } {
    const cutoffTime = new Date(Date.now() - (minutes * 60 * 1000));
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowestEndpoints: [],
        statusCodeDistribution: {}
      };
    }

    // Calculate average response time
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;

    // Calculate error rate
    const errors = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errors / recentMetrics.length) * 100;

    // Group by endpoint and method
    const endpointGroups = new Map<string, { times: number[]; count: number }>();
    recentMetrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      if (!endpointGroups.has(key)) {
        endpointGroups.set(key, { times: [], count: 0 });
      }
      const group = endpointGroups.get(key)!;
      group.times.push(m.responseTime);
      group.count++;
    });

    // Find slowest endpoints
    const slowestEndpoints = Array.from(endpointGroups.entries())
      .map(([key, data]) => {
        const [method, endpoint] = key.split(' ', 2);
        const averageTime = data.times.reduce((sum, time) => sum + time, 0) / data.times.length;
        return { endpoint, method, averageTime, count: data.count };
      })
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    // Status code distribution
    const statusCodeDistribution: Record<string, number> = {};
    recentMetrics.forEach(m => {
      const statusRange = `${Math.floor(m.statusCode / 100)}xx`;
      statusCodeDistribution[statusRange] = (statusCodeDistribution[statusRange] || 0) + 1;
    });

    return {
      totalRequests: recentMetrics.length,
      averageResponseTime,
      errorRate,
      slowestEndpoints,
      statusCodeDistribution
    };
  }

  /**
   * Get memory usage trends
   */
  getMemoryTrends(minutes: number = 10): Array<{
    timestamp: Date;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  }> {
    const cutoffTime = new Date(Date.now() - (minutes * 60 * 1000));
    return this.metrics
      .filter(m => m.timestamp >= cutoffTime)
      .map(m => ({
        timestamp: m.timestamp,
        heapUsed: m.memoryUsage.heapUsed,
        heapTotal: m.memoryUsage.heapTotal,
        external: m.memoryUsage.external,
        rss: m.memoryUsage.rss
      }));
  }

  /**
   * Check if system is healthy based on metrics
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: SystemMetrics;
  } {
    const metrics = this.getSystemMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check memory usage (warning at 80%, critical at 90%)
    const memoryUsagePercent = (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      status = 'critical';
      issues.push(`Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`);
    } else if (memoryUsagePercent > 80) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
    }

    // Check error rate (warning at 5%, critical at 10%)
    if (metrics.errorRate > 10) {
      status = 'critical';
      issues.push(`Critical error rate: ${metrics.errorRate.toFixed(1)}%`);
    } else if (metrics.errorRate > 5) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push(`High error rate: ${metrics.errorRate.toFixed(1)}%`);
    }

    // Check average response time (warning at 1000ms, critical at 2000ms)
    if (metrics.averageResponseTime > 2000) {
      status = 'critical';
      issues.push(`Critical response time: ${metrics.averageResponseTime.toFixed(0)}ms`);
    } else if (metrics.averageResponseTime > 1000) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push(`Slow response time: ${metrics.averageResponseTime.toFixed(0)}ms`);
    }

    return {
      status,
      issues,
      metrics
    };
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - (60 * 60 * 1000)); // Keep 1 hour of data
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.metrics = [];
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.activeConnections = 0;
    this.systemStartTime = new Date();
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    system: SystemMetrics;
    recentMetrics: PerformanceMetrics[];
    summary: ReturnType<typeof this.getPerformanceSummary>;
  } {
    return {
      system: this.getSystemMetrics(),
      recentMetrics: this.metrics.slice(-100),
      summary: this.getPerformanceSummary(5)
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();