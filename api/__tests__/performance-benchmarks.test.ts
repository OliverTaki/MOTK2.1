import request from 'supertest';
import express from 'express';
import { performance } from 'perf_hooks';
import { setupSwagger } from '../swagger';
import authRoutes from '../routes/auth';
import sheetsRoutes from '../routes/sheets';
import entitiesRoutes from '../routes/entities';
import filesRoutes from '../routes/files';
import projectsRoutes from '../routes/projects';
import { SheetsApiClient } from '../services/sheets/SheetsApiClient';
import { EntityManager } from '../services/entities/EntityManager';
import { StorageManager } from '../services/storage/StorageManager';

// Mock external dependencies
jest.mock('../services/sheets/SheetsApiClient');
jest.mock('../services/auth/AuthService');
jest.mock('../services/storage/StorageManager');

describe('Performance Benchmarks', () => {
  let app: express.Application;
  let server: any;
  let mockSheetsClient: jest.Mocked<SheetsApiClient>;

  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    SIMPLE_GET: 100,      // Simple GET requests should be under 100ms
    ENTITY_CREATE: 200,   // Entity creation should be under 200ms
    SHEET_UPDATE: 300,    // Sheet updates should be under 300ms
    BATCH_OPERATION: 500, // Batch operations should be under 500ms
    FILE_UPLOAD: 1000,    // File uploads should be under 1s
    LARGE_QUERY: 800      // Large dataset queries should be under 800ms
  };

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    setupSwagger(app as any);
    
    // Mount routes
    app.use('/api/auth', authRoutes);
    app.use('/api/sheets', sheetsRoutes);
    app.use('/api/entities', entitiesRoutes);
    app.use('/api/files', filesRoutes);
    app.use('/api/projects', projectsRoutes);
    
    server = app.listen(0);

    // Setup mocks
    mockSheetsClient = new SheetsApiClient() as jest.Mocked<SheetsApiClient>;
    setupPerformanceMocks();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  function setupPerformanceMocks() {
    // Mock with realistic delays to simulate network latency
    mockSheetsClient.getSheetData.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
      return {
        values: [
          ['shot_id', 'title', 'episode', 'scene', 'status'],
          ['shot_001', 'Test Shot 1', 'E01', 'S01', 'in_progress'],
          ['shot_002', 'Test Shot 2', 'E01', 'S02', 'completed']
        ],
        range: 'Shots!A1:E3',
        majorDimension: 'ROWS'
      };
    });

    mockSheetsClient.updateCell.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 75)); // 75ms delay
      return {
        success: true,
        updatedRange: 'Shots!B2',
        updatedRows: 1,
        conflict: false
      };
    });

    mockSheetsClient.appendRows.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      return {
        success: true,
        updatedRange: 'Shots!A4:E4',
        updatedRows: 1
      };
    });
  }

  async function measurePerformance<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`${operationName}: ${duration.toFixed(2)}ms`);
    return { result, duration };
  }

  describe('API Endpoint Performance', () => {
    it('should handle simple GET requests within performance threshold', async () => {
      const { duration } = await measurePerformance(
        () => request(app).get('/api/entities/shot').expect(200),
        'Simple GET request'
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_GET);
    });

    it('should handle entity creation within performance threshold', async () => {
      const testShot = {
        shot_id: 'perf_shot_001',
        title: 'Performance Test Shot',
        episode: 'E01',
        scene: 'S01',
        status: 'in_progress'
      };

      const { duration } = await measurePerformance(
        () => request(app).post('/api/entities/shot').send(testShot).expect(200),
        'Entity creation'
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.ENTITY_CREATE);
    });

    it('should handle sheet updates within performance threshold', async () => {
      const updateData = {
        entityId: 'shot_001',
        fieldId: 'title',
        originalValue: 'Test Shot 1',
        newValue: 'Updated Test Shot 1'
      };

      const { duration } = await measurePerformance(
        () => request(app).put('/api/sheets/Shots/cell').send(updateData),
        'Sheet cell update'
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SHEET_UPDATE);
    });

    it('should handle batch operations within performance threshold', async () => {
      const batchUpdates = {
        updates: Array.from({ length: 10 }, (_, i) => ({
          entityId: `shot_${i.toString().padStart(3, '0')}`,
          fieldId: 'status',
          originalValue: 'in_progress',
          newValue: 'completed'
        }))
      };

      const { duration } = await measurePerformance(
        () => request(app).post('/api/sheets/Shots/batch').send(batchUpdates),
        'Batch update operation'
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_OPERATION);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent read operations efficiently', async () => {
      const concurrentReads = 20;
      const operations = Array.from({ length: concurrentReads }, () =>
        () => request(app).get('/api/entities/shot')
      );

      const { duration } = await measurePerformance(
        () => Promise.all(operations.map(op => op())),
        `${concurrentReads} concurrent read operations`
      );

      // Concurrent operations should not take much longer than sequential
      const expectedMaxDuration = PERFORMANCE_THRESHOLDS.SIMPLE_GET * 2;
      expect(duration).toBeLessThan(expectedMaxDuration);
    });

    it('should handle concurrent write operations with reasonable performance', async () => {
      const concurrentWrites = 10;
      const operations = Array.from({ length: concurrentWrites }, (_, i) => ({
        shot_id: `concurrent_shot_${i.toString().padStart(3, '0')}`,
        title: `Concurrent Test Shot ${i}`,
        episode: 'E01',
        scene: `S${i.toString().padStart(2, '0')}`,
        status: 'in_progress'
      }));

      const { duration } = await measurePerformance(
        () => Promise.all(operations.map(shot =>
          request(app).post('/api/entities/shot').send(shot)
        )),
        `${concurrentWrites} concurrent write operations`
      );

      // Concurrent writes should be reasonable
      const expectedMaxDuration = PERFORMANCE_THRESHOLDS.ENTITY_CREATE * 3;
      expect(duration).toBeLessThan(expectedMaxDuration);
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle large dataset queries efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => [
        `shot_${i.toString().padStart(4, '0')}`,
        `Test Shot ${i}`,
        `E${Math.floor(i / 100) + 1}`,
        `S${(i % 100) + 1}`,
        i % 2 === 0 ? 'in_progress' : 'completed'
      ]);

      mockSheetsClient.getSheetData.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate larger query time
        return {
          values: [
            ['shot_id', 'title', 'episode', 'scene', 'status'],
            ...largeDataset
          ],
          range: 'Shots!A1:E1001',
          majorDimension: 'ROWS'
        };
      });

      const { duration } = await measurePerformance(
        () => request(app).get('/api/entities/shot').query({ limit: 100, offset: 0 }),
        'Large dataset query with pagination'
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_QUERY);
    });

    it('should handle filtering and sorting on large datasets', async () => {
      // Mock large dataset with varied data
      const largeDataset = Array.from({ length: 500 }, (_, i) => [
        `shot_${i.toString().padStart(4, '0')}`,
        `Test Shot ${i}`,
        `E${Math.floor(i / 50) + 1}`,
        `S${(i % 50) + 1}`,
        ['in_progress', 'completed', 'on_hold', 'approved'][i % 4],
        Math.floor(Math.random() * 5) + 1 // priority
      ]);

      mockSheetsClient.getSheetData.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return {
          values: [
            ['shot_id', 'title', 'episode', 'scene', 'status', 'priority'],
            ...largeDataset
          ],
          range: 'Shots!A1:F501',
          majorDimension: 'ROWS'
        };
      });

      const { duration } = await measurePerformance(
        () => request(app)
          .get('/api/entities/shot')
          .query({ 
            filter: 'status:in_progress',
            sort: 'priority:desc',
            limit: 50 
          }),
        'Filtered and sorted large dataset query'
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_QUERY);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not have significant memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/entities/shot');
        
        // Force garbage collection periodically if available
        if (global.gc && i % 20 === 0) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      const maxMemoryIncrease = 50 * 1024 * 1024; // 50MB
      expect(memoryIncrease).toBeLessThan(maxMemoryIncrease);
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Database Operation Performance', () => {
    it('should handle sheet read operations efficiently', async () => {
      const iterations = 50;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = await measurePerformance(
          () => mockSheetsClient.getSheetData('Shots'),
          `Sheet read iteration ${i + 1}`
        );
        durations.push(duration);
      }

      const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      console.log(`Sheet read performance - Avg: ${averageDuration.toFixed(2)}ms, Min: ${minDuration.toFixed(2)}ms, Max: ${maxDuration.toFixed(2)}ms`);

      // Average should be reasonable
      expect(averageDuration).toBeLessThan(100);
      // No single operation should be extremely slow
      expect(maxDuration).toBeLessThan(500);
    });

    it('should handle sheet write operations efficiently', async () => {
      const iterations = 30;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = await measurePerformance(
          () => mockSheetsClient.updateCell({
            sheetName: 'Shots',
            entityId: `shot_${i}`,
            fieldId: 'title',
            originalValue: `Old Title ${i}`,
            newValue: `New Title ${i}`
          }),
          `Sheet write iteration ${i + 1}`
        );
        durations.push(duration);
      }

      const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      console.log(`Sheet write performance - Avg: ${averageDuration.toFixed(2)}ms, Max: ${maxDuration.toFixed(2)}ms`);

      expect(averageDuration).toBeLessThan(150);
      expect(maxDuration).toBeLessThan(400);
    });
  });

  describe('API Response Time Consistency', () => {
    it('should have consistent response times for identical requests', async () => {
      const iterations = 20;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = await measurePerformance(
          () => request(app).get('/api/entities/shot'),
          `Consistency test iteration ${i + 1}`
        );
        durations.push(duration);
      }

      const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const standardDeviation = Math.sqrt(
        durations.reduce((sum, duration) => sum + Math.pow(duration - averageDuration, 2), 0) / durations.length
      );

      console.log(`Response time consistency - Avg: ${averageDuration.toFixed(2)}ms, StdDev: ${standardDeviation.toFixed(2)}ms`);

      // Standard deviation should be low (consistent performance)
      expect(standardDeviation).toBeLessThan(averageDuration * 0.5); // Within 50% of average
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should handle realistic production load', async () => {
      // Simulate realistic production load:
      // - 80% read operations
      // - 15% write operations  
      // - 5% complex operations
      
      const totalOperations = 100;
      const readOps = Math.floor(totalOperations * 0.8);
      const writeOps = Math.floor(totalOperations * 0.15);
      const complexOps = totalOperations - readOps - writeOps;

      const operations: Array<() => Promise<any>> = [];

      // Add read operations
      for (let i = 0; i < readOps; i++) {
        operations.push(() => request(app).get('/api/entities/shot'));
      }

      // Add write operations
      for (let i = 0; i < writeOps; i++) {
        operations.push(() => request(app).post('/api/entities/shot').send({
          shot_id: `load_test_shot_${i}`,
          title: `Load Test Shot ${i}`,
          episode: 'E01',
          scene: `S${i}`,
          status: 'in_progress'
        }));
      }

      // Add complex operations (batch updates)
      for (let i = 0; i < complexOps; i++) {
        operations.push(() => request(app).post('/api/sheets/Shots/batch').send({
          updates: Array.from({ length: 5 }, (_, j) => ({
            entityId: `shot_${i}_${j}`,
            fieldId: 'status',
            originalValue: 'in_progress',
            newValue: 'completed'
          }))
        }));
      }

      // Shuffle operations to simulate realistic load pattern
      for (let i = operations.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [operations[i], operations[j]] = [operations[j], operations[i]];
      }

      const { duration } = await measurePerformance(
        () => Promise.all(operations.map(op => op())),
        `Production load simulation (${totalOperations} operations)`
      );

      // Should handle production load within reasonable time
      const maxAcceptableTime = 5000; // 5 seconds for 100 operations
      expect(duration).toBeLessThan(maxAcceptableTime);

      console.log(`Load test completed: ${totalOperations} operations in ${duration.toFixed(2)}ms`);
      console.log(`Average operation time: ${(duration / totalOperations).toFixed(2)}ms`);
    });
  });
});