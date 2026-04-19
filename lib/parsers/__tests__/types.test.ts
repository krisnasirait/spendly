import { describe, it, expect } from 'vitest';
import type { ParserPlugin, ExtractionStrategy, ValidationRule } from '../types';

describe('ParserPlugin type', () => {
  it('should accept valid plugin structure', () => {
    const plugin: ParserPlugin = {
      id: 'test',
      version: '1.0.0',
      priority: 0,
      match: {
        from_patterns: ['*@test.com'],
        subject_patterns: ['*test*'],
      },
      extract: {
        amount: [{ type: 'regex', pattern: '(\\d+)' }],
        merchant: [{ type: 'regex', pattern: 'Merchant:\\s*(.+)' }],
        date: [{ type: 'regex', pattern: 'Date:\\s*(.+)' }],
      },
      validate: {
        amount: { min: 0, max: 1000000000 },
        merchant: { minLength: 2 },
      },
    };

    expect(plugin.id).toBe('test');
    expect(plugin.extract.amount[0].type).toBe('regex');
  });

  it('should enforce ValidationRule structure', () => {
    const rule: ValidationRule = {
      min: 0,
      max: 1000,
      notFuture: true,
      maxFutureDays: 1,
      minLength: 2,
    };

    expect(rule.min).toBe(0);
    expect(rule.notFuture).toBe(true);
  });

  it('should support ExtractionStrategy types', () => {
    const strategies: ExtractionStrategy[] = [
      { type: 'regex', pattern: 'amount:\\s*(.+)' },
      { type: 'xpath', pattern: '//span[@class="amount"]' },
      { type: 'keyword_proximity', fallback: 'Amount', proximity_window: 50 },
    ];

    expect(strategies[0].type).toBe('regex');
    expect(strategies[2].type).toBe('keyword_proximity');
    expect(strategies[2].proximity_window).toBe(50);
  });
});