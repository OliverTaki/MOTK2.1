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
 * Performance monitoring service – records latency / errors / resource usage.
 * Register in server.ts:
 *   import { performanceMonitor } from './services/monitoring/PerformanceMonitor';
 *   app.use(performanceMonitor.middleware());
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private systemStartTime = new Date();
  private totalRequests = 0;
  private totalErrors = 0;
  private activeConnections = 0;
  private readonly maxMetricsHistory = 1000;

  constructor() {
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000);
  }

  /* ----------------------------------------------------------------- */
  /* Express middleware                                                */
  /* ----------------------------------------------------------------- */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = process.hrtime.bigint();
      const startCpu = process.cpuUsage();

      this.totalRequests++;
      this.activeConnections++;

      res.once('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
        const cpu = process.cpuUsage(startCpu);

        const metric: PerformanceMetrics = {
          endpoint: req.path,
          method: req.method,
          responseTime: durationMs,
          statusCode: res.statusCode,
          timestamp: new Date(),
          userAgent: req.get('User-Agent'),
          ip: req.ip || (req.connection as any).remoteAddress,
          memoryUsage: process.memoryUsage(),
          cpuUsage: cpu,
        };

        if (res.statusCode >= 400) this.totalErrors++;

        this.activeConnections--;
        this.recordMetric(metric);
      });

      next();
    };
  }

  /* ----------------------------------------------------------------- */
  /* Internal helpers                                                  */
  /* ----------------------------------------------------------------- */
  private recordMetric(m: PerformanceMetrics): void {
    this.metrics.push(m);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - 60 * 60 * 1000;
    this.metrics = this.metrics.filter((m) => m.timestamp.getTime() >= cutoff);
  }

  /* ----------------------------------------------------------------- */
  /* Public read APIs                                                  */
  /* ----------------------------------------------------------------- */
  getSystemMetrics(): SystemMetrics {
    const uptimeSec = (Date.now() - this.systemStartTime.getTime()) / 1000;
    const last = this.metrics.slice(-100);
    const avgResp = last.length ? last.reduce((s, m) => s + m.responseTime, 0) / last.length : 0;
    const errRate = this.totalRequests ? (this.totalErrors / this.totalRequests) * 100 : 0;

    return {
      uptime: uptimeSec,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: this.activeConnections,
      totalRequests: this.totalRequests,
      errorRate: errRate,
      averageResponseTime: avgResp,
    };
  }

  /** Performance summary for the last N minutes */
  getPerformanceSummary(minutes = 5) {
    const cutoff = Date.now() - minutes * 60 * 1000;
    const recent = this.metrics.filter((m) => m.timestamp.getTime() >= cutoff);

    if (!recent.length) return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowestEndpoints: [],
      statusCodeDistribution: {},
    };

    const avgResp = recent.reduce((s, m) => s + m.responseTime, 0) / recent.length;
    const errors = recent.filter((m) => m.statusCode >= 400).length;
    const errRate = (errors / recent.length) * 100;

    const groups = new Map<string, { times: number[]; count: number }>();
    for (const m of recent) {
      const key = `${m.method} ${m.endpoint}`;
      const g = groups.get(key) || { times: [], count: 0 };
      g.times.push(m.responseTime);
      g.count++;
      groups.set(key, g);
    }
    const slowest = Array.from(groups.entries())
      .map(([k, g]) => {
        const [method, endpoint] = k.split(' ', 2);
        const avg = g.times.reduce((s, t) => s + t, 0) / g.times.length;
        return { endpoint, method, averageTime: avg, count: g.count };
      })
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    const dist: Record<string, number> = {};
    for (const m of recent) {
      const range = `${Math.floor(m.statusCode / 100)}xx`;
      dist[range] = (dist[range] || 0) + 1;
    }

    return {
      totalRequests: recent.length,
      averageResponseTime: avgResp,
      errorRate: errRate,
      slowestEndpoints: slowest,
      statusCodeDistribution: dist,
    };
  }

  /** Health evaluation used by /health route */
  getHealthStatus() {
    const sys = this.getSystemMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    const memPct = (sys.memoryUsage.heapUsed / sys.memoryUsage.heapTotal) * 100;
    if (memPct > 90) {
      status = 'critical';
      issues.push(`Critical memory usage: ${memPct.toFixed(1)}%`);
    } else if (memPct > 80) {
      status = 'warning';
      issues.push(`High memory usage: ${memPct.toFixed(1)}%`);
    }

    if (sys.errorRate > 10) {
      status = 'critical';
      issues.push(`Critical error rate: ${sys.errorRate.toFixed(1)}%`);
    } else if (sys.errorRate > 5) {
      status = 'warning';
      issues.push(`High error rate: ${sys.errorRate.toFixed(1)}%`);
    }

    if (sys.averageResponseTime > 2000) {
      status = 'critical';
      issues.push(`Critical response time: ${sys.averageResponseTime.toFixed(0)}ms`);
    } else if (sys.averageResponseTime > 1000) {
      status = 'warning';
      issues.push(`Slow response time: ${sys.averageResponseTime.toFixed(0)}ms`);
    }

    return { status, issues, metrics: sys };
  }

  exportMetrics() {
    return {
      system: this.getSystemMetrics(),
      recentMetrics: this.metrics.slice(-100),
      summary: this.getPerformanceSummary(5),
    };
  }

  reset(): void {
    this.metrics = [];
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.activeConnections = 0;
    this.systemStartTime = new Date();
  }
}

export const performanceMonitor = new PerformanceMonitor();
