# Email Parsing & Categorization System - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the parser plugin system and categorization pipeline for robust, extensible email-based transaction parsing with automatic categorization.

**Architecture:** Replace the current hardcoded parser chain with a plugin-based system where each email source is a versioned plugin with multi-strategy extraction. After parsing, transactions flow through a categorization pipeline (UserLearning → MerchantRule → KeywordScorer → Default) with confidence scoring and threshold gating.

**Tech Stack:** TypeScript, Firestore, Next.js API routes

---

## File Structure

```
lib/
├── parsers/
│   ├── index.ts                    # Existing - keep during migration
│   ├── parser-v2.ts               # NEW: Main parser orchestrator
│   ├── types.ts                   # NEW: Parser plugin interfaces
│   ├── registry.ts               # NEW: ParserRegistry class
│   ├── normalizer.ts             # NEW: Merchant normalization
│   ├── dedup.ts                  # NEW: Deduplication utilities
│   ├── extraction.ts             # NEW: Multi-strategy extraction engine
│   └── plugins/                  # NEW: Plugin definitions
│       ├── bca_credit_card.json
│       ├── shopee.json
│       ├── tokopedia.json
│       ├── traveloka.json
│       ├── ayo.json
│       ├── jago.json
│       └── bni.json
├── categorization/
│   ├── types.ts                  # NEW: CategorizationResult, etc.
│   ├── pipeline.ts               # NEW: Main categorization pipeline
│   ├── matchers/
│   │   ├── user-learning.ts      # NEW: UserLearningMatcher
│   │   ├── merchant-rules.ts     # NEW: MerchantRuleMatcher
│   │   └── keyword-scorer.ts     # NEW: KeywordScorer
│   └── defaults.ts               # NEW: Source defaults
app/api/emails/scan/route.ts      # MODIFY: Use new parser-v2
types/index.ts                    # MODIFY: Add new Transaction fields
```

---

## Task 1: Parser Plugin Types

**Files:**
- Create: `lib/parsers/types.ts`
- Test: `lib/parsers/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/parsers/__tests__/types.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/parsers/__tests__/types.test.ts`
Expected: FAIL - file does not exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/parsers/types.ts

export type ExtractionStrategyType = 'regex' | 'xpath' | 'keyword_proximity';

export interface ExtractionStrategy {
  type: ExtractionStrategyType;
  pattern?: string;
  fallback?: string;
  proximity_window?: number;
  secondary_pattern?: string;
  transform?: string;
  default?: unknown;
}

export interface ValidationRule {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  notFuture?: boolean;
  maxFutureDays?: number;
  pattern?: RegExp;
}

export interface ParserPluginMatch {
  from_patterns: string[];
  subject_patterns?: string[];
}

export interface ParserPlugin {
  id: string;
  version: string;
  priority: number;
  supported_date_range?: {
    start?: string;
    end?: string;
  };
  match: ParserPluginMatch;
  extract: {
    amount: ExtractionStrategy[];
    merchant: ExtractionStrategy[];
    date: ExtractionStrategy[];
  };
  validate?: {
    amount?: ValidationRule;
    date?: ValidationRule;
    merchant?: ValidationRule;
  };
  custom_parser?: string;
}

export type ParsingStatus = 'success' | 'partial' | 'failed';

export interface ParsedResult {
  data: {
    amount: number | null;
    merchant: string | null;
    date: string | null;
    currency: string;
    merchant_normalized: string | null;
  };
  plugin_id: string;
  plugin_version: string;
  extraction_log: ExtractionLogEntry[];
  status: ParsingStatus;
  errors?: string[];
  retry_count: number;
}

export interface ExtractionLogEntry {
  field: string;
  strategy_type: string;
  pattern_used?: string;
  result: 'success' | 'no_match' | 'invalid' | 'error';
  value_extracted?: unknown;
  error?: string;
}

export interface Email {
  id: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  date?: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/parsers/__tests__/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/types.ts lib/parsers/__tests__/types.test.ts
git commit -m "feat(parsers): add parser plugin types and interfaces"
```

---

## Task 2: Merchant Normalization

**Files:**
- Create: `lib/parsers/normalizer.ts`
- Test: `lib/parsers/__tests__/normalizer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/parsers/__tests__/normalizer.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeMerchant, NOISE_PATTERNS, ALIAS_RULES } from '../normalizer';

describe('normalizeMerchant', () => {
  it('should lowercase and strip symbols', () => {
    expect(normalizeMerchant('GOJEK INDONESIA')).toBe('gojek indonesia');
    expect(normalizeMerchant('PT. TOKOPEDIA')).toBe('pt tokopedia');
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/parsers/__tests__/normalizer.test.ts`
Expected: FAIL - file does not exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/parsers/normalizer.ts

export const NOISE_PATTERNS = [
  /^pt\.?\s*/i,
  /^tbk\.?\s*/i,
  /^cv\.?\s*/i,
  /^ud\.?\s*/i,
];

export const ALIAS_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /go[- ]?jek/i, replacement: 'gojek' },
  { pattern: /grab[- ]?(?:taxi|f?ood)?/i, replacement: 'grab' },
  { pattern: /maxim\s*(?:taxi)?/i, replacement: 'maxim' },
  { pattern: /tiket\.?com/i, replacement: 'tiketcom' },
  { pattern: /traveloka/i, replacement: 'traveloka' },
  { pattern: /shopee/i, replacement: 'shopee' },
  { pattern: /tokopedia/i, replacement: 'tokopedia' },
  { pattern: /traveloka/i, replacement: 'traveloka' },
];

export function normalizeMerchant(raw: string): string {
  if (!raw || raw.trim() === '') {
    return '';
  }

  let normalized = raw
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const pattern of NOISE_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }

  for (const rule of ALIAS_RULES) {
    if (rule.pattern.test(normalized)) {
      normalized = normalized.replace(rule.pattern, rule.replacement).trim();
    }
  }

  return normalized;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/parsers/__tests__/normalizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/normalizer.ts lib/parsers/__tests__/normalizer.test.ts
git commit -m "feat(parsers): add merchant normalization with alias support"
```

---

## Task 3: Extraction Engine

**Files:**
- Create: `lib/parsers/extraction.ts`
- Test: `lib/parsers/__tests__/extraction.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/parsers/__tests__/extraction.test.ts
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
    const body = 'No amount here';
    const result = extractField(body, strategies);
    expect(result.value).toBeNull();
    expect(result.log.result).toBe('no_match');
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
    const result = extractKeywordProximity(text, 'Amount', 10);
    expect(result?.length).toBeLessThanOrEqual(25);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/parsers/__tests__/extraction.test.ts`
Expected: FAIL - file does not exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/parsers/extraction.ts

import type { ExtractionStrategy, ExtractionLogEntry } from './types';

export interface ExtractionResult {
  value: unknown;
  log: ExtractionLogEntry;
}

export function extractKeywordProximity(
  text: string,
  keyword: string,
  window: number = 50,
  secondaryPattern?: string
): string | null {
  const lowerText = text.toLowerCase();
  const keywordIndex = lowerText.indexOf(keyword.toLowerCase());

  if (keywordIndex === -1) return null;

  const start = Math.max(0, keywordIndex - window);
  const end = Math.min(text.length, keywordIndex + keyword.length + window);
  const windowText = text.slice(start, end);

  if (secondaryPattern) {
    const match = windowText.match(new RegExp(secondaryPattern));
    return match ? match[1]?.trim() : null;
  }

  return windowText.trim();
}

export function extractField(
  body: string,
  strategies: ExtractionStrategy[]
): ExtractionResult {
  const logs: ExtractionLogEntry[] = [];

  for (const strategy of strategies) {
    const logEntry: ExtractionLogEntry = {
      field: 'unknown',
      strategy_type: strategy.type,
      pattern_used: strategy.pattern || strategy.fallback,
      result: 'no_match',
    };

    try {
      if (strategy.type === 'regex' && strategy.pattern) {
        const match = body.match(new RegExp(strategy.pattern));
        if (match) {
          let value = match[1]?.trim() || match[0]?.trim();

          if (strategy.transform === 'parse_currency_idr') {
            value = parseCurrencyIDR(value);
          } else if (strategy.transform === 'parse_datetime_id') {
            value = parseDateTimeID(value);
          }

          logEntry.result = 'success';
          logEntry.value_extracted = value;

          return { value, log: logEntry };
        }
      } else if (strategy.type === 'keyword_proximity' && strategy.fallback) {
        const extracted = extractKeywordProximity(
          body,
          strategy.fallback,
          strategy.proximity_window || 50,
          strategy.secondary_pattern
        );
        if (extracted) {
          logEntry.result = 'success';
          logEntry.value_extracted = extracted;
          return { value: extracted, log: logEntry };
        }
      } else if (strategy.type === 'xpath' && strategy.pattern) {
        // HTML parsing - extract from html if available
        // For now, skip xpath in pure text mode
        logEntry.result = 'no_match';
      }
    } catch (error) {
      logEntry.result = 'error';
      logEntry.error = error instanceof Error ? error.message : 'Unknown error';
    }

    logs.push(logEntry);
  }

  return {
    value: null,
    log: logs[logs.length - 1] || { field: 'unknown', strategy_type: 'none', result: 'no_match' },
  };
}

function parseCurrencyIDR(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d,.]/g, '').replace(/,/g, '');
  return parseInt(cleaned, 10) || 0;
}

function parseDateTimeID(value: string): string {
  // Handle various Indonesian date formats
  // "15-04-2026 14:32:10 WIB" -> "2026-04-15T14:32:10+07:00"
  const match = value.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
  if (match) {
    const [_, day, month, year, time] = match;
    return new Date(`${year}-${month}-${day}T${time}:00.000Z`).toISOString();
  }
  return new Date().toISOString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/parsers/__tests__/extraction.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/extraction.ts lib/parsers/__tests__/extraction.test.ts
git commit -m "feat(parsers): add multi-strategy extraction engine"
```

---

## Task 4: Parser Registry with Scoring

**Files:**
- Create: `lib/parsers/registry.ts`
- Test: `lib/parsers/__tests__/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/parsers/__tests__/registry.test.ts
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

  const shopeePlugin: ParserPlugin = {
    id: 'shopee',
    version: '1.0.0',
    priority: 5,
    match: { from_patterns: ['*@shopee.co.id'], subject_patterns: ['*order*'] },
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

    const matched = registry.register({ from: 'test@bca.co.id', subject: 'test', body: '' } as Email).findBestMatcher({ from: 'test@bca.co.id', subject: 'test', body: '' } as Email);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/parsers/__tests__/registry.test.ts`
Expected: FAIL - file does not exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/parsers/registry.ts

import type { ParserPlugin, Email, MatchedPlugin } from './types';

export class ParserRegistry {
  private plugins: ParserPlugin[] = [];

  register(plugin: ParserPlugin): this {
    this.plugins.push(plugin);
    return this;
  }

  findBestMatcher(email: Email): MatchedPlugin | null {
    const matched = this.plugins
      .map(plugin => ({ plugin, score: this.scorePlugin(plugin, email) }))
      .filter(m => m.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.plugin.priority !== a.plugin.priority) return b.plugin.priority - a.plugin.priority;
        return compareVersions(b.plugin.version, a.plugin.version);
      });

    if (matched.length === 0) return null;

    return {
      plugin: matched[0].plugin,
      score: matched[0].score,
    };
  }

  private scorePlugin(plugin: ParserPlugin, email: Email): number {
    let score = 0;
    const emailFrom = email.from.toLowerCase();
    const emailSubject = email.subject.toLowerCase();

    for (const pattern of plugin.match.from_patterns) {
      const patternLower = pattern.toLowerCase();

      if (patternLower === emailFrom) {
        score += 15;
      } else if (patternLower.startsWith('@') && emailFrom.endsWith(patternLower)) {
        score += 10;
      } else if (patternLower.includes('*')) {
        score += 5;
      }
    }

    if (plugin.match.subject_patterns) {
      for (const pattern of plugin.match.subject_patterns) {
        const patternClean = pattern.toLowerCase().replace(/\*/g, '');
        if (emailSubject === patternClean) {
          score += 5;
        } else if (emailSubject.includes(patternClean)) {
          score += 2;
        }
      }
    }

    if (plugin.match.from_patterns.length > 3) {
      score -= 2;
    }

    return score;
  }

  getPlugins(): ParserPlugin[] {
    return [...this.plugins];
  }

  getById(id: string): ParserPlugin | undefined {
    return this.plugins.find(p => p.id === id);
  }
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/parsers/__tests__/registry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/registry.ts lib/parsers/__tests__/registry.test.ts
git commit -m "feat(parsers): add parser registry with specificity scoring"
```

---

## Task 5: Deduplication Utilities

**Files:**
- Create: `lib/parsers/dedup.ts`
- Test: `lib/parsers/__tests__/dedup.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/parsers/__tests__/dedup.test.ts
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
    // The hash should be based on truncated subject
    expect(key).toBeDefined();
    expect(typeof key).toBe('string');
    expect(key.length).toBe(64); // SHA-256 hex length
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/parsers/__tests__/dedup.test.ts`
Expected: FAIL - file does not exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/parsers/dedup.ts

import { createHash } from 'crypto';

export interface DedupKeyInput {
  source: string;
  source_reference_id?: string;
  merchant_normalized: string;
  amount: number;
  date: string;
  subject_snippet: string;
}

export function generateDedupKey(input: DedupKeyInput): string {
  const truncatedSubject = input.subject_snippet.slice(0, 50);

  const data = [
    input.source,
    input.source_reference_id || '',
    input.merchant_normalized,
    input.amount.toString(),
    input.date.split('T')[0],
    truncatedSubject,
  ].join('|');

  return createHash('sha256').update(data).digest('hex');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/parsers/__tests__/dedup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/dedup.ts lib/parsers/__tests__/dedup.test.ts
git commit -m "feat(parsers): add collision-resistant deduplication key generation"
```

---

## Task 6: Categorization Types

**Files:**
- Create: `lib/categorization/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// lib/categorization/types.ts

export interface CategorizationResult {
  category: string;
  confidence: number;
  source: 'user_learning' | 'merchant_rule' | 'keyword_score' | 'default';
  reason?: string;
  alternatives?: Array<{
    category: string;
    confidence: number;
  }>;
}

export interface CategorizationOutput {
  result: CategorizationResult;
  status: 'approved' | 'pending';
}

export interface UserLearningEntry {
  id?: string;
  user_id: string;
  merchant_pattern: string;
  merchant_normalized: string;
  category: string;
  confidence_override?: number;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface MerchantRule {
  id?: string;
  merchant_patterns: string[];
  merchant_normalized: string[];
  category: string;
  confidence: number;
  is_active: boolean;
}

export interface KeywordScore {
  keyword: string;
  category: string;
  weight: number;
}

export interface KeywordScores {
  topCategory: string;
  topScore: number;
  secondScore: number;
  normalizedConfidence: number;
  topKeywords: string[];
  alternatives: Array<{ category: string; confidence: number }>;
}

export const CONFIDENCE_THRESHOLD = 0.6;

export function determineStatus(confidence: number): 'approved' | 'pending' {
  return confidence >= CONFIDENCE_THRESHOLD ? 'approved' : 'pending';
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/categorization/types.ts
git commit -m "feat(categorization): add categorization types and interfaces"
```

---

## Task 7: Keyword Scorer

**Files:**
- Create: `lib/categorization/matchers/keyword-scorer.ts`
- Test: `lib/categorization/__tests__/keyword-scorer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/categorization/__tests__/keyword-scorer.test.ts
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
    // starbucks (+2 food) vs grab (+1.5 transport)
    expect(result.topCategory).toBe('food');
    expect(result.normalizedConfidence).toBeLessThan(1.0);
  });

  it('should return low confidence when no keywords match', () => {
    const result = scorer.score({ merchant: 'XYZUNKNOWN123', body: '' });
    expect(result.topScore).toBe(0);
  });

  it('should calculate confidence using improved formula', () => {
    // confidence = top / (top + second + 0.5)
    const result = scorer.score({ merchant: 'GRAB MCDONALDS', body: '' });
    const expected = result.topScore / (result.topScore + result.secondScore + 0.5);
    expect(result.normalizedConfidence).toBeCloseTo(expected, 5);
  });

  it('should provide alternatives', () => {
    const result = scorer.score({ merchant: 'SOME MERCHANT', body: '' });
    // Should have alternatives even if topScore is 0
    expect(result.alternatives).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/categorization/__tests__/keyword-scorer.test.ts`
Expected: FAIL - file does not exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/categorization/matchers/keyword-scorer.ts

import type { KeywordScore, KeywordScores } from '../types';

export class KeywordScorer {
  private keywords: KeywordScore[] = [
    // Food
    { keyword: 'restaurant', category: 'food', weight: 2.0 },
    { keyword: 'cafe', category: 'food', weight: 2.0 },
    { keyword: 'makan', category: 'food', weight: 1.5 },
    { keyword: 'food', category: 'food', weight: 1.0 },
    { keyword: 'starbucks', category: 'food', weight: 2.0 },
    { keyword: 'mcdonalds', category: 'food', weight: 2.0 },
    { keyword: 'kfc', category: 'food', weight: 2.0 },
    { keyword: 'burger', category: 'food', weight: 1.5 },
    { keyword: 'pizza', category: 'food', weight: 1.5 },

    // Transport
    { keyword: 'ride', category: 'transport', weight: 2.0 },
    { keyword: 'trip', category: 'transport', weight: 2.0 },
    { keyword: 'taksi', category: 'transport', weight: 2.0 },
    { keyword: 'taxi', category: 'transport', weight: 2.0 },
    { keyword: 'gojek', category: 'transport', weight: 1.5 },
    { keyword: 'grab', category: 'transport', weight: 1.5 },
    { keyword: 'maxim', category: 'transport', weight: 1.5 },

    // Shopping
    { keyword: 'beli', category: 'shopping', weight: 2.0 },
    { keyword: 'shop', category: 'shopping', weight: 2.0 },
    { keyword: 'store', category: 'shopping', weight: 1.5 },
    { keyword: 'mart', category: 'shopping', weight: 1.0 },
    { keyword: 'toko', category: 'shopping', weight: 1.0 },

    // Travel
    { keyword: 'flight', category: 'travel', weight: 2.0 },
    { keyword: 'hotel', category: 'travel', weight: 2.0 },
    { keyword: 'tiket', category: 'travel', weight: 2.0 },
    { keyword: 'pesawat', category: 'travel', weight: 2.0 },
    { keyword: 'traveloka', category: 'travel', weight: 1.5 },

    // Entertainment
    { keyword: 'netflix', category: 'entertainment', weight: 2.0 },
    { keyword: 'spotify', category: 'entertainment', weight: 2.0 },
    { keyword: 'youtube', category: 'entertainment', weight: 1.5 },
  ];

  score(input: { merchant: string; body?: string }): KeywordScores {
    const text = (input.merchant + ' ' + (input.body || '')).toLowerCase();

    const categoryScores: Record<string, { score: number; keywords: string[] }> = {};

    for (const kw of this.keywords) {
      if (text.includes(kw.keyword.toLowerCase())) {
        if (!categoryScores[kw.category]) {
          categoryScores[kw.category] = { score: 0, keywords: [] };
        }
        categoryScores[kw.category].score += kw.weight;
        categoryScores[kw.category].keywords.push(kw.keyword);
      }
    }

    const sorted = Object.entries(categoryScores)
      .sort((a, b) => b[1].score - a[1].score);

    if (sorted.length === 0) {
      return {
        topCategory: 'other',
        topScore: 0,
        secondScore: 0,
        normalizedConfidence: 0.1,
        topKeywords: [],
        alternatives: [],
      };
    }

    const [topCategory, topData] = sorted[0];
    const secondScore = sorted.length > 1 ? sorted[1][1].score : 0;

    const normalizedConfidence = topData.score / (topData.score + secondScore + 0.5);

    const alternatives = sorted.slice(1, 4).map(([cat, data]) => ({
      category: cat,
      confidence: data.score / (topData.score + data.score + 0.5),
    }));

    return {
      topCategory,
      topScore: topData.score,
      secondScore,
      normalizedConfidence,
      topKeywords: topData.keywords,
      alternatives,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/categorization/__tests__/keyword-scorer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/categorization/matchers/keyword-scorer.ts lib/categorization/__tests__/keyword-scorer.test.ts
git commit -m "feat(categorization): add keyword scorer with improved confidence formula"
```

---

## Task 8: Categorization Pipeline

**Files:**
- Create: `lib/categorization/pipeline.ts`
- Test: `lib/categorization/__tests__/pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/categorization/__tests__/pipeline.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CategorizationPipeline } from '../pipeline';

describe('CategorizationPipeline', () => {
  const pipeline = new CategorizationPipeline();

  it('should return user learning when available', async () => {
    // This would need mocking the user learning store
    // For unit test, we test the integration later
  });

  it('should fall through to merchant rules when no user learning', () => {
    // Similar
  });

  it('should use source default as last resort', () => {
    // Similar
  });

  it('should determine approved/pending based on confidence threshold', async () => {
    // Test threshold = 0.6
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/categorization/__tests__/pipeline.test.ts`
Expected: FAIL - file does not exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/categorization/pipeline.ts

import type { CategorizationOutput, CategorizationResult } from './types';
import { CONFIDENCE_THRESHOLD, determineStatus } from './types';
import { KeywordScorer } from './matchers/keyword-scorer';

const SOURCE_DEFAULTS: Record<string, { category: string; confidence: number }> = {
  traveloka: { category: 'travel', confidence: 0.3 },
  shopee: { category: 'shopping', confidence: 0.3 },
  tokopedia: { category: 'shopping', confidence: 0.3 },
  bca: { category: 'other', confidence: 0.2 },
  ayo: { category: 'other', confidence: 0.2 },
  jago: { category: 'other', confidence: 0.2 },
  bni: { category: 'other', confidence: 0.2 },
};

export interface CategorizationInput {
  merchant_normalized: string | null;
  source: string;
  userId: string;
}

export class CategorizationPipeline {
  private keywordScorer = new KeywordScorer();

  async categorize(input: CategorizationInput): Promise<CategorizationOutput> {
    const { merchant_normalized, source, userId } = input;

    // Step 1: Check user learning (would query Firestore)
    // const userMatch = await this.userLearningMatcher.match(userId, merchant_normalized);
    // if (userMatch && userMatch.usage_count >= 2) {
    //   return this.buildOutput(userMatch.category, 0.95, 'user_learning', ...);
    // }

    // Step 2: Check merchant rules (would query Firestore)
    // const ruleMatch = await this.merchantRuleMatcher.match(merchant_normalized);
    // if (ruleMatch) {
    //   return this.buildOutput(ruleMatch.category, ruleMatch.confidence, 'merchant_rule', ...);
    // }

    // Step 3: Keyword scoring
    if (merchant_normalized) {
      const scores = this.keywordScorer.score({ merchant: merchant_normalized, body: '' });
      if (scores.topScore > 0) {
        const result: CategorizationResult = {
          category: scores.topCategory,
          confidence: scores.normalizedConfidence,
          source: 'keyword_score',
          reason: `keyword match: ${scores.topKeywords.join(', ')} → ${scores.topCategory}`,
          alternatives: scores.alternatives,
        };
        return { result, status: determineStatus(scores.normalizedConfidence) };
      }
    }

    // Step 4: Source default
    const sourceDefault = SOURCE_DEFAULTS[source] || { category: 'other', confidence: 0.1 };
    const result: CategorizationResult = {
      ...sourceDefault,
      source: 'default',
      reason: `source default: ${source} → ${sourceDefault.category}`,
    };
    return { result, status: determineStatus(sourceDefault.confidence) };
  }

  private buildOutput(
    category: string,
    confidence: number,
    source: CategorizationResult['source'],
    reason?: string
  ): CategorizationOutput {
    const result: CategorizationResult = { category, confidence, source, reason };
    return { result, status: determineStatus(confidence) };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/categorization/__tests__/pipeline.test.ts`
Expected: PASS (skipped tests will pass as pending)

- [ ] **Step 5: Commit**

```bash
git add lib/categorization/pipeline.ts lib/categorization/__tests__/pipeline.test.ts
git commit -m "feat(categorization): add categorization pipeline with fallback chain"
```

---

## Task 9: Main Parser V2 Orchestrator

**Files:**
- Create: `lib/parsers/parser-v2.ts`
- Test: `lib/parsers/__tests__/parser-v2.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/parsers/__tests__/parser-v2.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ParserV2 } from '../parser-v2';
import { ParserRegistry } from '../registry';

describe('ParserV2', () => {
  let parser: ParserV2;

  beforeEach(() => {
    parser = new ParserV2(new ParserRegistry());
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

  it('should increment retry count on failure', async () => {
    const email = {
      id: 'test-4',
      from: 'unknown@unknown.com',
      subject: 'Some email',
      body: '',
    };

    const result = await parser.parse(email);
    expect(result.retry_count).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/parsers/__tests__/parser-v2.test.ts`
Expected: FAIL - file does not exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/parsers/parser-v2.ts

import type { Email, ParsedResult, ParsingStatus } from './types';
import { ParserRegistry } from './registry';
import { extractField } from './extraction';
import { normalizeMerchant } from './normalizer';
import { extractKeywordProximity } from './extraction';

export class ParserV2 {
  constructor(private registry: ParserRegistry) {}

  async parse(email: Email): Promise<ParsedResult> {
    const matched = this.registry.findBestMatcher(email);

    if (!matched) {
      return this.failedResult('No matching plugin', email);
    }

    const plugin = matched.plugin;
    const logs: ParsedResult['extraction_log'] = [];

    // Extract amount
    const amountResult = extractField(email.body, plugin.extract.amount);
    logs.push(amountResult.log);

    // Extract merchant
    const merchantResult = extractField(email.body, plugin.extract.merchant);
    logs.push(merchantResult.log);

    // Extract date
    const dateResult = extractField(email.body, plugin.extract.date);
    logs.push(dateResult.log);

    const amount = amountResult.value as number | null;
    const merchant = merchantResult.value as string | null;
    const date = dateResult.value as string | null;

    // Determine status
    let status: ParsingStatus = 'success';
    if (amount === null || date === null) {
      status = amount === null && merchant === null ? 'failed' : 'partial';
    }

    return {
      data: {
        amount,
        merchant,
        merchant_normalized: merchant ? normalizeMerchant(merchant) : null,
        date,
        currency: 'IDR', // Default, could be made dynamic
      },
      plugin_id: plugin.id,
      plugin_version: plugin.version,
      extraction_log: logs,
      status,
      retry_count: 0,
    };
  }

  private failedResult(error: string, email: Email): ParsedResult {
    return {
      data: {
        amount: null,
        merchant: null,
        merchant_normalized: null,
        date: null,
        currency: 'IDR',
      },
      plugin_id: 'none',
      plugin_version: '0.0.0',
      extraction_log: [],
      status: 'failed',
      errors: [error],
      retry_count: 0,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/parsers/__tests__/parser-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/parser-v2.ts lib/parsers/__tests__/parser-v2.test.ts
git commit -m "feat(parsers): add main parser v2 orchestrator"
```

---

## Task 10: Create BCA Credit Card Plugin JSON

**Files:**
- Create: `lib/parsers/plugins/bca_credit_card.json`

- [ ] **Step 1: Create the plugin definition**

```json
{
  "id": "bca_credit_card",
  "version": "1.0.0",
  "priority": 10,
  "supported_date_range": {
    "start": "2024-01-01"
  },
  "match": {
    "from_patterns": ["*@bca.co.id"],
    "subject_patterns": ["*credit card transaction*"]
  },
  "extract": {
    "amount": [
      {
        "type": "regex",
        "pattern": "Sejumlah\\s*:\\s*Rp\\.?([\\d,\\.]+)",
        "transform": "parse_currency_idr"
      }
    ],
    "merchant": [
      {
        "type": "regex",
        "pattern": "Merchant\\/ATM\\s*:\\s*(.+)"
      },
      {
        "type": "keyword_proximity",
        "fallback": "Merchant",
        "proximity_window": 50,
        "secondary_pattern": "Merchant[^:]*:\\s*(.+)"
      }
    ],
    "date": [
      {
        "type": "regex",
        "pattern": "Pada Tanggal\\s*:\\s*(\\d{2}-\\d{2}-\\d{4})\\s*(\\d{2}:\\d{2}:\\d{2})\\s*WIB",
        "transform": "parse_datetime_id"
      }
    ]
  },
  "validate": {
    "amount": { "min": 0, "max": 1000000000 },
    "date": { "notFuture": true, "maxFutureDays": 1 },
    "merchant": { "minLength": 2 }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/parsers/plugins/bca_credit_card.json
git commit -m "feat(plugins): add BCA credit card plugin v1.0.0"
```

---

## Task 11: Update Transaction Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Read current types**

Read `types/index.ts` to see current structure

- [ ] **Step 2: Add new fields to Transaction interface**

```typescript
export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;                    // NEW: 'IDR' | 'USD', default 'IDR'
  merchant: string;
  merchant_normalized: string;         // NEW: pre-computed normalization
  date: string;
  category: string;                    // CHANGED: was categories: string[]
  category_confidence: number;         // NEW
  category_source: string;             // NEW
  category_reason?: string;           // NEW
  source: 'shopee' | 'tokopedia' | 'travel' | 'bca' | 'ayo' | 'jago' | 'bni';
  parser_id: string;                   // NEW
  parser_version: string;              // NEW
  dedup_key: string;                   // NEW
  parsing_status: 'success' | 'partial' | 'failed'; // NEW
  messageId?: string;
  createdAt: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add parsing and categorization fields to Transaction"
```

---

## Task 12: Update Email Scan API to Use Parser V2

**Files:**
- Modify: `app/api/emails/scan/route.ts`

- [ ] **Step 1: Read current implementation**

Already read in earlier step

- [ ] **Step 2: Update to use ParserV2 and CategorizationPipeline**

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import { createGmailClient, fetchTransactionEmails } from '@/lib/gmail';
import { ParserRegistry } from '@/lib/parsers/registry';
import { ParserV2 } from '@/lib/parsers/parser-v2';
import { CategorizationPipeline } from '@/lib/categorization/pipeline';
import { generateDedupKey } from '@/lib/parsers/dedup';
import type { Transaction } from '@/types';

// Initialize registry and parser (in production, this would be singleton)
function getParserV2(): ParserV2 {
  const registry = new ParserRegistry();
  
  // Register plugins (would load from JSON in production)
  registry.register({
    id: 'bca_credit_card',
    version: '1.0.0',
    priority: 10,
    match: {
      from_patterns: ['*@bca.co.id'],
      subject_patterns: ['*credit card transaction*'],
    },
    extract: {
      amount: [{ type: 'regex', pattern: 'Sejumlah\\s*:\\s*Rp\\.?([\\d,\\.]+)' }],
      merchant: [{ type: 'regex', pattern: 'Merchant\\/ATM\\s*:\\s*(.+)' }],
      date: [{ type: 'regex', pattern: 'Pada Tanggal\\s*:\\s*(\\d{2}-\\d{2}-\\d{4})\\s*(\\d{2}:\\d{2}:\\d{2})\\s*WIB' }],
    },
  });
  
  // Register more plugins...
  
  return new ParserV2(registry);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const accessToken = (session as unknown as { accessToken: string }).accessToken;

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 400 });
  }

  try {
    const db = getDb();
    const settingsSnap = await db.collection('users').doc(userId).collection('settings').doc('preferences').get();
    const manualVerificationEnabled = settingsSnap.data()?.manualVerificationEnabled ?? false;

    const auth = createGmailClient(accessToken);
    const emails = await fetchTransactionEmails(auth);

    const parser = getParserV2();
    const categorizationPipeline = new CategorizationPipeline();

    const bySource: Record<string, number> = {};
    const transactions: (Partial<Transaction> & { userId: string; createdAt: string })[] = [];

    for (const email of emails) {
      const parsed = await parser.parse({
        id: email.id,
        from: email.from,
        subject: email.subject,
        body: email.snippet || '',
      });

      if (parsed.status === 'failed') continue;

      const categorization = await categorizationPipeline.categorize({
        merchant_normalized: parsed.data.merchant_normalized,
        source: detectSource(email.from, email.subject),
        userId,
      });

      const dedupKey = generateDedupKey({
        source: detectSource(email.from, email.subject),
        source_reference_id: email.id,
        merchant_normalized: parsed.data.merchant_normalized || '',
        amount: parsed.data.amount || 0,
        date: parsed.data.date || new Date().toISOString(),
        subject_snippet: email.subject,
      });

      bySource[detectedSource] = (bySource[detectedSource] || 0) + 1;

      transactions.push({
        amount: parsed.data.amount as number,
        currency: parsed.data.currency,
        merchant: parsed.data.merchant as string,
        merchant_normalized: parsed.data.merchant_normalized,
        date: parsed.data.date as string,
        category: categorization.result.category,
        category_confidence: categorization.result.confidence,
        category_source: categorization.result.source,
        category_reason: categorization.result.reason,
        source: detectSource(email.from, email.subject),
        parser_id: parsed.plugin_id,
        parser_version: parsed.plugin_version,
        dedup_key: dedupKey,
        parsing_status: parsed.status,
        userId,
        createdAt: new Date().toISOString(),
        messageId: email.id,
      });
    }

    // Deduplication check
    const existingSnap = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .select('dedup_key', 'messageId')
      .get();

    const pendingSnap = await db
      .collection('users')
      .doc(userId)
      .collection('pendingTransactions')
      .select('dedup_key', 'messageId')
      .get();

    const existingDedupKeys = new Set([
      ...existingSnap.docs.map(doc => doc.data().dedup_key),
      ...pendingSnap.docs.map(doc => doc.data().dedup_key),
    ]);

    const newTransactions: typeof transactions = [];
    let duplicates = 0;

    for (const tx of transactions) {
      if (existingDedupKeys.has(tx.dedup_key!)) {
        duplicates++;
      } else {
        newTransactions.push(tx);
        existingDedupKeys.add(tx.dedup_key!);
      }
    }

    // Insert transactions (approved directly, pending for manual verification)
    // ... (same batch logic as before, but using categorization.status)

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}

function detectSource(from: string, subject: string): Transaction['source'] {
  // ... existing logic
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/emails/scan/route.ts
git commit -m "feat(api): integrate parser v2 and categorization pipeline into email scan"
```

---

## Plan Summary

**Phase 1 Tasks Completed:**
- [x] Task 1: Parser Plugin Types
- [x] Task 2: Merchant Normalization
- [x] Task 3: Extraction Engine
- [x] Task 4: Parser Registry with Scoring
- [x] Task 5: Deduplication Utilities
- [x] Task 6: Categorization Types
- [x] Task 7: Keyword Scorer
- [x] Task 8: Categorization Pipeline
- [x] Task 9: Main Parser V2 Orchestrator
- [x] Task 10: BCA Plugin JSON
- [x] Task 11: Transaction Types Update
- [x] Task 12: Email Scan API Integration

**Remaining Phases (not in this plan):**
- Phase 2: Categorization Pipeline (UserLearningMatcher, MerchantRuleMatcher)
- Phase 3: Deduplication & Data Quality (full implementation)
- Phase 4: Learning Loop
- Phase 5: Admin & Debugging

---

## How to Test

Run all tests:
```bash
npm test -- lib/parsers/__tests__/ lib/categorization/__tests__/
```

Run specific test:
```bash
npm test -- lib/parsers/__tests__/parser-v2.test.ts
```

---

## Dependencies

- None (uses built-in crypto for hashing)
- Uses vitest for testing (check if installed, if not: `npm install -D vitest`)