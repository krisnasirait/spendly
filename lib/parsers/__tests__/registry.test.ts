import { describe, it, expect, beforeEach } from 'vitest';
import { ParserRegistry } from '../registry';
import type { ParserPlugin, Email } from '../types';

describe('ParserRegistry', () => {
  let registry: ParserRegistry;

  const bcaPlugin: ParserPlugin = {
    id: 'bca_credit_card',
    version: '1.0.0',
    priority: 10,
    match: { from_patterns: ['*@bca.co.id'], subject_patterns: ['*credit card*'] },
    extract: { amount: [], merchant: [], date: [] },
  };

  const bcaGenericPlugin: ParserPlugin = {
    id: 'bca_generic',
    version: '1.0.0',
    priority: 0,
    match: { from_patterns: ['*@bca.co.id'] },
    extract: { amount: [], merchant: [], date: [] },
  };

  beforeEach(() => {
    registry = new ParserRegistry();
  });

  it('should register and retrieve plugins', () => {
    registry.register(bcaPlugin);
    const found = registry.findBestMatcher({ from: 'test@bca.co.id', subject: 'test', body: '' } as Email);
    expect(found?.plugin.id).toBe('bca_credit_card');
  });

  it('should score exact email match higher than wildcard', () => {
    registry.register(bcaPlugin);
    registry.register(bcaGenericPlugin);

    const matched = registry.findBestMatcher({ from: 'no-reply@bca.co.id', subject: 'test', body: '' } as Email);
    expect(matched?.plugin.id).toBe('bca_credit_card');
    expect(matched?.score).toBeGreaterThan(0);
  });

  it('should prefer higher priority on tie', () => {
    const plugin1: ParserPlugin = { ...bcaPlugin, id: 'p1', priority: 5 };
    const plugin2: ParserPlugin = { ...bcaPlugin, id: 'p2', priority: 10 };

    registry.register(plugin1);
    registry.register(plugin2);

    const matched = registry.findBestMatcher({ from: 'no-reply@bca.co.id', subject: 'credit card transaction', body: '' } as Email);
    expect(matched?.plugin.id).toBe('p2');
  });

  it('should return null for unmatched email', () => {
    registry.register(bcaPlugin);
    const matched = registry.findBestMatcher({ from: 'test@other.com', subject: 'test', body: '' } as Email);
    expect(matched).toBeNull();
  });

  it('should penalize plugins with too many from patterns', () => {
    const broadPlugin: ParserPlugin = {
      ...bcaPlugin,
      id: 'broad',
      match: { from_patterns: ['*@a.com', '*@b.com', '*@c.com', '*@d.com'] },
    };
    registry.register(broadPlugin);

    const matched = registry.findBestMatcher({ from: 'test@a.com', subject: 'test', body: '' } as Email);
    expect(matched?.score).toBeLessThan(15);
  });
});
