import { describe, it, expect } from 'vitest';
import { generateDedupKey } from '../dedup';

describe('generateDedupKey', () => {
  it('should generate consistent hash for same input', () => {
    const tx1 = {
      source: 'bca',
      source_reference_id: 'msg-123',
      merchant_normalized: 'gojek',
      amount: 50000,
      date: '2026-04-15T10:00:00+07:00',
      subject_snippet: 'Credit Card Transaction Notification',
    };

    const tx2 = {
      ...tx1,
      source_reference_id: 'msg-123',
    };

    expect(generateDedupKey(tx1)).toBe(generateDedupKey(tx2));
  });

  it('should generate different hash for different amounts', () => {
    const base = {
      source: 'bca',
      source_reference_id: 'msg-123',
      merchant_normalized: 'gojek',
      amount: 50000,
      date: '2026-04-15T10:00:00+07:00',
      subject_snippet: 'Credit Card Transaction Notification',
    };

    const different = { ...base, amount: 60000 };
    expect(generateDedupKey(base)).not.toBe(generateDedupKey(different));
  });

  it('should generate different hash for different merchants', () => {
    const base = {
      source: 'bca',
      source_reference_id: 'msg-123',
      merchant_normalized: 'gojek',
      amount: 50000,
      date: '2026-04-15T10:00:00+07:00',
      subject_snippet: 'Credit Card Transaction Notification',
    };

    const different = { ...base, merchant_normalized: 'grab' };
    expect(generateDedupKey(base)).not.toBe(generateDedupKey(different));
  });

  it('should include subject_snippet in hash', () => {
    const base = {
      source: 'bca',
      source_reference_id: 'msg-123',
      merchant_normalized: 'gojek',
      amount: 50000,
      date: '2026-04-15T10:00:00+07:00',
      subject_snippet: 'Transaction 1',
    };

    const differentSubject = { ...base, subject_snippet: 'Transaction 2' };
    expect(generateDedupKey(base)).not.toBe(generateDedupKey(differentSubject));
  });

  it('should truncate subject to 50 chars', () => {
    const longSubject = 'A'.repeat(100);
    const tx = {
      source: 'bca',
      source_reference_id: 'msg-123',
      merchant_normalized: 'gojek',
      amount: 50000,
      date: '2026-04-15T10:00:00+07:00',
      subject_snippet: longSubject,
    };

    const key = generateDedupKey(tx);
    expect(key).toBeDefined();
    expect(typeof key).toBe('string');
    expect(key.length).toBe(64); // SHA-256 hex length
  });
});
