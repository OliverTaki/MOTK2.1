import { vi } from 'vitest';
import { queryClient, queryKeys } from '../queryClient';

describe('queryClient configuration', () => {
  it('should have correct default options', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    
    expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
    expect(defaultOptions.queries?.cacheTime).toBe(10 * 60 * 1000); // 10 minutes
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(true);
    expect(defaultOptions.queries?.refetchOnReconnect).toBe(true);
    expect(defaultOptions.queries?.refetchInterval).toBe(30 * 1000); // 30 seconds
    expect(defaultOptions.queries?.refetchIntervalInBackground).toBe(false);
  });

  it('should have retry logic that prevents retrying on 4xx errors', () => {
    const retryFunction = queryClient.getDefaultOptions().queries?.retry as Function;
    
    // Should not retry on 4xx errors
    const error4xx = { response: { status: 404 } };
    expect(retryFunction(1, error4xx)).toBe(false);
    
    const error401 = { response: { status: 401 } };
    expect(retryFunction(1, error401)).toBe(false);
    
    // Should retry on 5xx errors
    const error5xx = { response: { status: 500 } };
    expect(retryFunction(1, error5xx)).toBe(true);
    expect(retryFunction(2, error5xx)).toBe(true);
    expect(retryFunction(3, error5xx)).toBe(false); // Max 3 retries
    
    // Should retry on network errors
    const networkError = { message: 'Network Error' };
    expect(retryFunction(1, networkError)).toBe(true);
  });

  it('should have exponential backoff retry delay', () => {
    const retryDelayFunction = queryClient.getDefaultOptions().queries?.retryDelay as Function;
    
    expect(retryDelayFunction(0)).toBe(1000); // 1 second
    expect(retryDelayFunction(1)).toBe(2000); // 2 seconds
    expect(retryDelayFunction(2)).toBe(4000); // 4 seconds
    expect(retryDelayFunction(10)).toBe(30000); // Max 30 seconds
  });

  it('should have mutation retry configuration', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    
    expect(defaultOptions.mutations?.retry).toBe(1);
    expect(defaultOptions.mutations?.retryDelay).toBe(1000);
  });
});

describe('queryKeys factory', () => {
  it('should generate correct sheet query keys', () => {
    expect(queryKeys.sheets.all).toEqual(['sheets']);
    expect(queryKeys.sheets.sheet('TestSheet')).toEqual(['sheets', 'TestSheet']);
    expect(queryKeys.sheets.sheetRange('TestSheet', 'A1:B10')).toEqual(['sheets', 'TestSheet', 'A1:B10']);
    expect(queryKeys.sheets.sheetRange('TestSheet')).toEqual(['sheets', 'TestSheet', undefined]);
  });

  it('should generate correct entity query keys', () => {
    expect(queryKeys.entities.all).toEqual(['entities']);
    expect(queryKeys.entities.type('shot')).toEqual(['entities', 'shot']);
    expect(queryKeys.entities.list('shot')).toEqual(['entities', 'shot', 'list', undefined]);
    expect(queryKeys.entities.list('shot', { limit: 10 })).toEqual(['entities', 'shot', 'list', { limit: 10 }]);
    expect(queryKeys.entities.detail('shot', 'shot1')).toEqual(['entities', 'shot', 'detail', 'shot1']);
  });

  it('should generate correct project query keys', () => {
    expect(queryKeys.projects.all).toEqual(['projects']);
    expect(queryKeys.projects.detail('project1')).toEqual(['projects', 'detail', 'project1']);
    expect(queryKeys.projects.config('project1')).toEqual(['projects', 'config', 'project1']);
  });

  it('should generate correct file query keys', () => {
    expect(queryKeys.files.all).toEqual(['files']);
    expect(queryKeys.files.entity('entity1')).toEqual(['files', 'entity', 'entity1']);
    expect(queryKeys.files.file('entity1', 'file.jpg')).toEqual(['files', 'entity', 'entity1', 'file.jpg']);
  });
});

describe('cache management', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should cache query data correctly', async () => {
    const testData = { test: 'data' };
    const queryKey = ['test', 'key'];
    
    queryClient.setQueryData(queryKey, testData);
    
    const cachedData = queryClient.getQueryData(queryKey);
    expect(cachedData).toEqual(testData);
  });

  it('should invalidate queries correctly', async () => {
    const testData = { test: 'data' };
    const queryKey = ['test', 'key'];
    
    queryClient.setQueryData(queryKey, testData);
    
    // Mock query state
    const queryState = queryClient.getQueryState(queryKey);
    expect(queryState?.data).toEqual(testData);
    
    await queryClient.invalidateQueries({ queryKey });
    
    // After invalidation, the query should be marked as stale
    const invalidatedState = queryClient.getQueryState(queryKey);
    expect(invalidatedState?.isInvalidated).toBe(true);
  });

  it('should remove queries correctly', () => {
    const testData = { test: 'data' };
    const queryKey = ['test', 'key'];
    
    queryClient.setQueryData(queryKey, testData);
    expect(queryClient.getQueryData(queryKey)).toEqual(testData);
    
    queryClient.removeQueries({ queryKey });
    expect(queryClient.getQueryData(queryKey)).toBeUndefined();
  });

  it('should handle prefetch queries', async () => {
    const mockQueryFn = vi.fn().mockResolvedValue({ data: 'prefetched' });
    const queryKey = ['prefetch', 'test'];
    
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: mockQueryFn,
      staleTime: 5 * 60 * 1000,
    });
    
    expect(mockQueryFn).toHaveBeenCalled();
    expect(queryClient.getQueryData(queryKey)).toEqual({ data: 'prefetched' });
  });
});