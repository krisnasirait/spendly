import { describe, it, expect, beforeEach } from 'vitest';
import { ParserV2 } from '../parser-v2';
import { ParserRegistry } from '../registry';

describe('ParserV2', () => {
  let parser: ParserV2;
  let registry: ParserRegistry;

  beforeEach(() => {
    registry = new ParserRegistry();
    registry.register({
      id: 'bca_credit_card',
      version: '1.0.0',
      priority: 10,
      match: {
        from_patterns: ['*@bca.co.id'],
        subject_patterns: ['*credit card*'],
      },
      extract: {
        amount: [{ type: 'regex', pattern: 'Sejumlah\\s*:\\s*Rp\\.?([\\d,\\.]+)', transform: 'parse_currency_idr' }],
        merchant: [{ type: 'regex', pattern: 'Merchant\\/ATM\\s*:\\s*(.+)' }],
        date: [{ type: 'regex', pattern: 'Pada Tanggal\\s*:\\s*(\\d{2}-\\d{2}-\\d{4})\\s*(\\d{2}:\\d{2}:\\d{2})\\s*WIB', transform: 'parse_datetime_id' }],
      },
    });
    parser = new ParserV2(registry);
  });

  it('should parse valid BCA email', async () => {
    const email = {
      id: 'test-1',
      from: 'no-reply@bca.co.id',
      subject: 'Credit Card Transaction Notification',
      body: `
        Sejumlah : Rp.1.250.000
        Merchant/ATM : GOJEK INDONESIA
        Pada Tanggal : 15-04-2026 14:32:10 WIB
      `,
    };

    const result = await parser.parse(email);
    expect(result.status).toBe('success');
    expect(result.data.amount).toBe(1250000);
    expect(result.data.merchant).toBe('GOJEK INDONESIA');
  });

  it('should return partial for missing merchant', async () => {
    const email = {
      id: 'test-2',
      from: 'no-reply@bca.co.id',
      subject: 'Credit Card Transaction Notification',
      body: `
        Sejumlah : Rp.150.000
        Pada Tanggal : 15-04-2026 14:32:10 WIB
      `,
    };

    const result = await parser.parse(email);
    expect(result.status).toBe('partial');
    expect(result.data.merchant).toBeNull();
  });

  it('should return failed for unparseable email', async () => {
    const email = {
      id: 'test-3',
      from: 'unknown@unknown.com',
      subject: 'Some email',
      body: 'No useful data here',
    };

    const result = await parser.parse(email);
    expect(result.status).toBe('failed');
  });

  it('should set retry_count to 0 initially', async () => {
    const email = {
      id: 'test-4',
      from: 'unknown@unknown.com',
      subject: 'Some email',
      body: '',
    };

    const result = await parser.parse(email);
    expect(result.retry_count).toBe(0);
  });

  it('should normalize merchant', async () => {
    const email = {
      id: 'test-5',
      from: 'no-reply@bca.co.id',
      subject: 'Credit Card Transaction Notification',
      body: `
        Sejumlah : Rp.50.000
        Merchant/ATM : GO-JEK INDONESIA
        Pada Tanggal : 15-04-2026 14:32:10 WIB
      `,
    };

    const result = await parser.parse(email);
    expect(result.data.merchant_normalized).toContain('gojek');
  });
});