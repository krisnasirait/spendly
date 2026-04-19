# Email Parsing & Auto-Categorization System

## Context

The current spendly system has 7 hardcoded regex-based parsers (Shopee, Tokopedia, Traveloka, BCA, Ayo, Jago, BNI) with categories hardwired per source. This creates:
- Brittle parsing that breaks on email format changes
- Inflexible categorization that doesn't adapt to user preferences
- Difficult onboarding for new email sources

## Design Principles

1. **User learning is ground truth** — user corrections override all other signals
2. **Extensible by configuration** — new sources added via config, not code
3. **Production-ready from day one** — confidence scores, versioning, structured output
4. **Design for scale** — learning data model exists from start, even if learning isn't implemented

---

## Architecture

```
Email
  ↓
Parser Plugin (versioned, multi-strategy extraction)
  ↓
Structured Transaction (amount, merchant, date, raw_source)
  ↓
Categorization Pipeline
  ├─ UserLearningMatcher (highest priority)
  ├─ MerchantRuleMatcher
  ├─ KeywordScorer
  └─ DefaultFallback (lowest priority)
  ↓
Final Output {category, confidence, source}
```

---

## Parsing System

### Parser Plugin Structure

```typescript
interface ParserPlugin {
  id: string;                    // e.g., "bca", "shopee"
  version: string;                // e.g., "1.0.0"
  supported_date_range?: {
    start?: string;               // ISO date
    end?: string;
  };

  // Source matching
  match: {
    from_patterns: string[];      // e.g., ["*@bca.co.id", "*@bca.com"]
    subject_patterns?: string[];  // e.g., ["*transaction*"]
  };

  // Field extraction (multi-strategy)
  extract: {
    amount: ExtractionStrategy[];
    merchant: ExtractionStrategy[];
    date: ExtractionStrategy[];
  };

  // Custom code for complex cases
  custom_parser?: string;         // Module path for edge cases
}

interface ExtractionStrategy {
  type: 'regex' | 'xpath' | 'keyword_proximity';
  pattern?: string;               // Regex or xpath
  fallback?: string;              // Keyword for proximity search
  transform?: string;            // e.g., "parse_currency_idr"
  default?: any;
}
```

### Extraction Strategy Priority

Each field tries strategies in order until one succeeds:

```
1. regex → matches → transform → done
2. xpath → matches → transform → done
3. keyword_proximity → finds nearest keyword → extract nearby value
4. default value → use default
```

### Example: BCA Credit Card Plugin

```json
{
  "id": "bca_credit_card",
  "version": "1.0.0",
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
        "fallback": "Merchant"
      }
    ],
    "date": [
      {
        "type": "regex",
        "pattern": "Pada Tanggal\\s*:\\s*(\\d{2}-\\d{2}-\\d{4})\\s*(\\d{2}:\\d{2}:\\d{2})\\s*WIB",
        "transform": "parse_datetime_id"
      }
    ]
  }
}
```

### Parser Registry

```typescript
class ParserRegistry {
  private plugins: Map<string, ParserPlugin>;

  register(plugin: ParserPlugin): void;
  find_matcher(email: Email): ParserPlugin | null;
  get_versioned_plugin(id: string, version: string): ParserPlugin | null;
}
```

---

## Categorization System

### Confidence Output

All categorization outputs include confidence:

```typescript
interface CategorizationResult {
  category: string;              // e.g., "food", "transport"
  confidence: number;            // 0.0 - 1.0
  source: 'user_learning' | 'merchant_rule' | 'keyword_score' | 'default';
  alternatives?: {               // Optional: top 2-3 alternatives
    category: string;
    confidence: number;
  }[];
}
```

### Categorization Pipeline

#### Step 1: UserLearningMatcher (Priority 1)

```typescript
interface UserLearningEntry {
  user_id: string;
  merchant_pattern: string;       // e.g., "gojek", "*tiket.com*"
  category: string;
  confidence_override?: number;  // User can say "always use this"
  created_at: Date;
  updated_at: Date;
}

// Matching: exact merchant name or wildcard pattern
// Confidence: 0.95 (user ground truth), or confidence_override if set
```

#### Step 2: MerchantRuleMatcher (Priority 2)

```typescript
interface MerchantRule {
  id: string;
  merchant_patterns: string[];    // ["gojek", "grab", "maxim"]
  category: string;
  confidence: number;            // e.g., 0.85
}

// Global rules (maintained by system)
// Confidence: 0.75-0.90 depending on rule quality
```

#### Step 3: KeywordScorer (Priority 3)

Lightweight scoring based on transaction context:

```typescript
interface KeywordScore {
  keyword: string;
  category: string;
  weight: number;                 // e.g., 2.0
}

// Score each category by summing keyword weights
// Normalize to 0-1 confidence
// confidence = top_score / (top_score + 1.0)
```

Example keywords:
```
food: ["restaurant", "cafe", "makan", "food", -1]
transport: ["ride", "trip", "taksi", "grab", "gojek", -1]
shopping: ["beli", "shop", "store", "mart"]
```

#### Step 4: DefaultFallback (Priority 4)

Source-based default as last resort:

```typescript
const SOURCE_DEFAULTS = {
  traveloka: { category: 'travel', confidence: 0.3 },
  shopee: { category: 'shopping', confidence: 0.3 },
  tokopedia: { category: 'shopping', confidence: 0.3 },
  bca: { category: 'other', confidence: 0.2 },
  // ...
};
```

### Pipeline Result Aggregation

```typescript
function categorize(
  tx: ParsedTransaction,
  userId: string
): CategorizationResult {
  // 1. Check user learning
  const userMatch = userLearningMatcher.match(userId, tx.merchant);
  if (userMatch) {
    return { category: userMatch.category, confidence: 0.95, source: 'user_learning' };
  }

  // 2. Check merchant rules
  const ruleMatch = merchantRuleMatcher.match(tx.merchant);
  if (ruleMatch) {
    return { category: ruleMatch.category, confidence: ruleMatch.confidence, source: 'merchant_rule' };
  }

  // 3. Keyword scoring
  const scores = keywordScorer.score(tx);
  if (scores.topScore > 0) {
    return { category: scores.topCategory, confidence: scores.normalizedConfidence, source: 'keyword_score' };
  }

  // 4. Source default
  const sourceDefault = SOURCE_DEFAULTS[tx.source] || { category: 'other', confidence: 0.1 };
  return { ...sourceDefault, source: 'default' };
}
```

---

## Data Model

### Firestore Collections

```
users/{userId}
  └── user_learning/{learningId}
        ├── user_id: string
        ├── merchant_pattern: string
        ├── category: string
        ├── confidence_override?: number
        ├── created_at: Timestamp
        └── updated_at: Timestamp

parsers/{parserId}/versions/{versionId}
  ├── ...ParserPlugin fields
  └── created_at: Timestamp

merchant_rules/{ruleId}
  ├── merchant_patterns: string[]
  ├── category: string
  ├── confidence: number
  └── is_active: boolean
```

---

## API Contracts

### Email Scan API (existing, updated)

```typescript
// POST /api/emails/scan
// Request: { forceRefresh?: boolean }
// Response:
{
  processed: number;
  new_transactions: number;
  results: Array<{
    id: string;
    merchant: string;
    amount: number;
    date: string;
    categorization: {
      category: string;
      confidence: number;
      source: string;
    };
    status: 'approved' | 'pending';
  }>;
}
```

### Categorization Feedback API

```typescript
// POST /api/transactions/{id}/categorize
// Request: { category: string, confidence_override?: number }
// Response: { success: true }

// This creates/updates user_learning entry
```

### Merchant Rules Admin API

```typescript
// GET /api/merchant-rules
// Response: { rules: MerchantRule[] }

// POST /api/merchant-rules
// Request: { merchant_patterns: string[], category: string, confidence: number }

// PATCH /api/merchant-rules/{id}
// Request: partial update

// DELETE /api/merchant-rules/{id}
```

---

## Implementation Phases

### Phase 1: Parser Plugin System (Foundation)
- [ ] Plugin interface and registry
- [ ] Migrate existing parsers to plugin format
- [ ] Version-aware parsing
- [ ] Multi-strategy extraction support
- [ ] Plugin storage in Firestore

### Phase 2: Categorization Pipeline
- [ ] CategorizationResult interface
- [ ] UserLearningMatcher implementation
- [ ] MerchantRuleMatcher implementation
- [ ] KeywordScorer implementation
- [ ] Pipeline orchestration
- [ ] Confidence output on all transactions

### Phase 3: Learning Loop
- [ ] User feedback collection
- [ ] user_learning collection writes
- [ ] Confidence override support
- [ ] Batch learning from corrections

### Phase 4: Admin & Debugging
- [ ] Merchant rules CRUD
- [ ] Parser version management
- [ ] Confidence debugging UI
- [ ] Parsing failure analytics

---

## Open Questions

1. **Learning TTL**: How long should user learning persist? Should it decay if user stops correcting?

2. **Rule priority conflicts**: If merchant rules and user learning disagree for a new merchant, user learning wins (confirmed). But should we prompt user anyway if confidence is low?

3. **Multi-category**: Should transactions ever have multiple categories (e.g., "food + transport" for a ride-hailing food order)?

4. **Plugin update strategy**: When a plugin is updated, should we reprocess old emails? (Probably optional, user-triggered.)

---

## Alternatives Considered

### Regex-Only Parsing
**Rejected**: Too fragile for production. HTML structure and localized formats break easily.

### ML-Based Categorization
**Deferred**: Overkill for MVP. Can add later using same confidence output interface.

### Global Learning (all users benefit)
**Deferred**: Requires privacy analysis, data anonymization. Per-user learning first.