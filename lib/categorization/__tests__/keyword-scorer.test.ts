import { describe, it, expect } from 'vitest';
import { KeywordScorer } from '../matchers/keyword-scorer';

describe('KeywordScorer', () => {
  const scorer = new KeywordScorer();

  it('should score food keywords correctly', () => {
    const result = scorer.score({ merchant: 'STARBUCKS COFFEE', body: '' });
    expect(result.topCategory).toBe('food');
    expect(result.topScore).toBeGreaterThan(0);
  });

  it('should score transport keywords correctly', () => {
    const result = scorer.score({ merchant: 'GOJEK RIDE', body: '' });
    expect(result.topCategory).toBe('transport');
  });

  it('should handle ambiguous merchants with conflicting keywords', () => {
    const result = scorer.score({ merchant: 'GRAB STARBUCKS', body: '' });
    expect(result.topCategory).toBe('food');
    expect(result.normalizedConfidence).toBeLessThan(1.0);
  });

  it('should return low confidence when no keywords match', () => {
    const result = scorer.score({ merchant: 'XYZUNKNOWN123', body: '' });
    expect(result.topScore).toBe(0);
  });

  it('should calculate confidence using improved formula', () => {
    const result = scorer.score({ merchant: 'GRAB MCDONALDS', body: '' });
    const expected = result.topScore / (result.topScore + result.secondScore + 0.5);
    expect(result.normalizedConfidence).toBeCloseTo(expected, 5);
  });

  it('should provide alternatives', () => {
    const result = scorer.score({ merchant: 'SOME MERCHANT', body: '' });
    expect(result.alternatives).toBeDefined();
  });
});