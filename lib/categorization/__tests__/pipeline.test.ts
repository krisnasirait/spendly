import { describe, it, expect } from 'vitest';
import { CategorizationPipeline } from '../pipeline';

describe('CategorizationPipeline', () => {
  const pipeline = new CategorizationPipeline();

  it('should use keyword scorer when no merchant match', async () => {
    const result = await pipeline.categorize({
      merchant_normalized: 'starbucks coffee',
      source: 'bca',
      userId: 'user-1',
    });
    expect(result.result.category).toBe('food');
    expect(result.result.confidence).toBeGreaterThan(0);
  });

  it('should use source default when no matches', async () => {
    const result = await pipeline.categorize({
      merchant_normalized: 'xyz unknown',
      source: 'bca',
      userId: 'user-1',
    });
    expect(result.result.category).toBe('other');
    expect(result.result.source).toBe('default');
  });

  it('should determine approved/pending based on confidence threshold', async () => {
    const highConf = await pipeline.categorize({
      merchant_normalized: 'starbucks',
      source: 'bca',
      userId: 'user-1',
    });
    expect(highConf.status).toBe('approved');

    const lowConf = await pipeline.categorize({
      merchant_normalized: 'xyz',
      source: 'bca',
      userId: 'user-1',
    });
    expect(lowConf.status).toBe('pending');
  });

  it('should include reason in result', async () => {
    const result = await pipeline.categorize({
      merchant_normalized: 'starbucks',
      source: 'bca',
      userId: 'user-1',
    });
    expect(result.result.reason).toBeDefined();
    expect(result.result.reason).toContain('keyword');
  });
});