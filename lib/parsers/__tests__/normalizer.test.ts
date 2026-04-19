import { describe, it, expect } from 'vitest';
import { normalizeMerchant, NOISE_PATTERNS, ALIAS_RULES } from '../normalizer';

describe('normalizeMerchant', () => {
  it('should lowercase and strip symbols', () => {
    expect(normalizeMerchant('GOJEK INDONESIA')).toBe('gojek');
    expect(normalizeMerchant('PT. TOKOPEDIA')).toBe('tokopedia');
  });

  it('should strip noise prefixes', () => {
    expect(normalizeMerchant('PT. Toko Saya')).toBe('toko saya');
    expect(normalizeMerchant('TBK Elektronik Jaya')).toBe('elektronik jaya');
    expect(normalizeMerchant('CV. Warung Kopi')).toBe('warung kopi');
  });

  it('should apply alias rules for known merchants', () => {
    expect(normalizeMerchant('GO-JEK INDONESIA')).toBe('gojek');
    expect(normalizeMerchant('Grab Taxi')).toBe('grab');
    expect(normalizeMerchant('GRAB FOOD')).toBe('grab');
    expect(normalizeMerchant('Tiket.com Booking')).toBe('tiketcom');
  });

  it('should handle complex merchant names with aliases', () => {
    expect(normalizeMerchant('Gojek Indonesia')).toContain('gojek');
    expect(normalizeMerchant('GrabFood Jakarta')).toBe('grab');
  });

  it('should preserve meaningful parts when no alias matches', () => {
    expect(normalizeMerchant('Warung Kopi Enak')).toBe('warung kopi enak');
    expect(normalizeMerchant('Elektronik Jaya Store')).toBe('elektronik jaya store');
  });

  it('should handle edge cases', () => {
    expect(normalizeMerchant('')).toBe('');
    expect(normalizeMerchant('   ')).toBe('');
    expect(normalizeMerchant('PT')).toBe('');
  });
});
