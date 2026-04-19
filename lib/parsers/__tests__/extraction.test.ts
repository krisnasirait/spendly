import { describe, it, expect } from 'vitest';
import { extractField, extractKeywordProximity } from '../extraction';
import type { ExtractionStrategy } from '../types';

describe('extractField', () => {
  const strategies: ExtractionStrategy[] = [
    { type: 'regex', pattern: 'Sejumlah\\s*:\\s*Rp\\.?([\\d,\\.]+)' },
    { type: 'keyword_proximity', fallback: 'Amount', proximity_window: 30 },
  ];

  it('should extract amount using regex', () => {
    const body = 'Informasi transaksi: Sejumlah : Rp.1.250.000 untuk GOJEK';
    const result = extractField(body, strategies);
    expect(result.value).toBe('1.250.000');
  });

  it('should return null if no match', () => {
    const body = 'Completely different text without keywords';
    const result = extractField(body, strategies);
    expect(result.value).toBeNull();
    expect(result.log[result.log.length - 1].result).toBe('no_match');
  });

  it('should log extraction attempts', () => {
    const body = 'test';
    const result = extractField(body, strategies);
    expect(result.log.length).toBeGreaterThan(0);
  });
});

describe('extractKeywordProximity', () => {
  it('should find keyword and extract window', () => {
    const text = 'Payment of Sejumlah : Rp.150.000 for merchant GOJEK';
    const result = extractKeywordProximity(text, 'Sejumlah', 20);
    expect(result).toContain('Rp');
  });

  it('should return null if keyword not found', () => {
    const result = extractKeywordProximity('no keyword here', 'missing', 50);
    expect(result).toBeNull();
  });

  it('should respect window size', () => {
    const text = 'A'.repeat(100) + 'Amount: Rp.100' + 'B'.repeat(100);
    const result = extractKeywordProximity(text, 'Amount', 9);
    expect(result?.length).toBeLessThanOrEqual(25);
  });
});
