import express from 'express';
import { performanceMonitor } from '../services/monitoring/PerformanceMonitor';
import { cacheService } from '../services/cache/CacheService';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * Get system health status
 */
router.get('/health', (req, res) => {
  try {
    const health = performanceMonitor.getHealthStatus();
    
    res.status(health.status === 'critical' ? 503 : 200).json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

/**
 * Get detailed system metrics (admin only)
 */
router.get('/metrics', requireAdmin, (req, res) => {
  try {
    const metrics = performanceMonitor.getSystemMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metrics'
    });
  }
});

/**
 * Get performance summary
 */
router.get('/performance', requireAdmin, (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 5;
    const summary = performanceMonitor.getPerformanceSummary(minutes);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get performance data'
    });
  }
});

/**
 * Get endpoint-specific metrics
 */
router.get('/endpoints/:endpoint', requireAdmin, (req, res) => {
  try {
    const { endpoint } = req.params;
    const { method } = req.query;
    
    const metrics = performanceMonitor.getEndpointMetrics(
      decodeURIComponent(endpoint),
      method as string
    );
    
    res.json({
      success: true,
      data: {
        endpoint: decodeURIComponent(endpoint),
        method,
        metrics,
        count: metrics.length,
        averageResponseTime: metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
          : 0
      }
    });
  } catch (error) {
    console.error('Get endpoint metrics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get endpoint metrics'
    });
  }
});

/**
 * Get memory usage trends
 */
router.get('/memory', requireAdmin, (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 10;
    const trends = performanceMonitor.getMemoryTrends(minutes);
    
    res.json({
      success: true,
      data: {
        trends,
        current: process.memoryUsage(),
        timeRange: `${minutes} minutes`
      }
    });
  } catch (error) {
    console.error('Get memory trends error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get memory trends'
    });
  }
});

/**
 * Get cache statistics
 */
router.get('/cache', requireAdmin, (req, res) => {
  try {
    const stats = cacheService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cache stats'
    });
  }
});

/**
 * Clear cache (admin only)
 */
router.delete('/cache', requireAdmin, (req, res) => {
  try {
    const { tags } = req.body;
    
    if (tags && Array.isArray(tags)) {
      const invalidated = cacheService.invalidateByTags(tags);
      res.json({
        success: true,
        message: `Invalidated ${invalidated} cache entries with tags: ${tags.join(', ')}`
      });
    } else {
      cacheService.clear();
      res.json({
        success: true,
        message: 'All cache entries cleared'
      });
    }
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cache'
    });
  }
});

/**
 * Export metrics for external monitoring systems
 */
router.get('/export', requireAdmin, (req, res) => {
  try {
    const format = req.query.format as string || 'json';
    const metrics = performanceMonitor.exportMetrics();
    
    if (format === 'prometheus') {
      // Export in Prometheus format
      const prometheus = convertToPrometheus(metrics);
      res.set('Content-Type', 'text/plain');
      res.send(prometheus);
    } else {
      // Default JSON format
      res.json({
        success: true,
        data: metrics,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Export metrics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export metrics'
    });
  }
});

/**
 * Get system information
 */
router.get('/system', requireAdmin, (req, res) => {
  try {
    const systemInfo = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      env: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        platform: process.env.VERCEL ? 'vercel' : 
                 process.env.RAILWAY_ENVIRONMENT ? 'railway' :
                 process.env.RENDER ? 'render' :
                 process.env.DYNO ? 'heroku' : 'local'
      }
    };
    
    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system info'
    });
  }
});

/**
 * Convert metrics to Prometheus format
 */
function convertToPrometheus(metrics: any): string {
  const lines: string[] = [];
  
  // System metrics
  lines.push('# HELP motk_uptime_seconds System uptime in seconds');
  lines.push('# TYPE motk_uptime_seconds counter');
  lines.push(`motk_uptime_seconds ${metrics.system.uptime}`);
  
  lines.push('# HELP motk_memory_usage_bytes Memory usage in bytes');
  lines.push('# TYPE motk_memory_usage_bytes gauge');
  lines.push(`motk_memory_usage_bytes{type="heap_used"} ${metrics.system.memoryUsage.heapUsed}`);
  lines.push(`motk_memory_usage_bytes{type="heap_total"} ${metrics.system.memoryUsage.heapTotal}`);
  lines.push(`motk_memory_usage_bytes{type="rss"} ${metrics.system.memoryUsage.rss}`);
  
  lines.push('# HELP motk_requests_total Total number of requests');
  lines.push('# TYPE motk_requests_total counter');
  lines.push(`motk_requests_total ${metrics.system.totalRequests}`);
  
  lines.push('# HELP motk_error_rate_percent Error rate percentage');
  lines.push('# TYPE motk_error_rate_percent gauge');
  lines.push(`motk_error_rate_percent ${metrics.system.errorRate}`);
  
  lines.push('# HELP motk_response_time_ms Average response time in milliseconds');
  lines.push('# TYPE motk_response_time_ms gauge');
  lines.push(`motk_response_time_ms ${metrics.system.averageResponseTime}`);
  
  lines.push('# HELP motk_active_connections Current active connections');
  lines.push('# TYPE motk_active_connections gauge');
  lines.push(`motk_active_connections ${metrics.system.activeConnections}`);
  
  return lines.join('\n') + '\n';
}

export default router;