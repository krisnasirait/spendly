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
Parser Registry (scored plugin matching)
  ↓
Parser Plugin (versioned, multi-strategy extraction)
  ↓
ParsedResult (with extraction_log)
  ↓
Merchant Normalization
  ↓
Deduplication Check
  ↓
Structured Transaction (amount, merchant, date, raw_source, merchant_normalized)
  ↓
Categorization Pipeline
  ├─ UserLearningMatcher (highest priority)
  ├─ MerchantRuleMatcher
  ├─ KeywordScorer
  └─ DefaultFallback (lowest priority)
  ↓
Final Output {category, confidence, source}
  ↓
Confidence Threshold Gate
  ├─ confidence >= 0.6 → status: "approved"
  └─ confidence < 0.6 → status: "pending" (needs review)
```

---

## Parsing System

### Parser Plugin Structure

```typescript
interface ParserPlugin {
  id: string;                    // e.g., "bca", "shopee"
  version: string;                // e.g., "1.0.0"
  priority: number;              // default 0, higher = preferred on tie
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

  // Validation rules per field
  validate?: {
    amount?: ValidationRule;      // e.g., { min: 0, max: 1000000000 }
    date?: ValidationRule;        // e.g., { notFuture: true, maxFutureDays: 1 }
    merchant?: ValidationRule;    // e.g., { minLength: 2 }
  };

  // Custom code for complex cases
  custom_parser?: string;         // Module path for edge cases
}

interface ExtractionStrategy {
  type: 'regex' | 'xpath' | 'keyword_proximity';
  pattern?: string;               // Regex or xpath
  fallback?: string;              // Keyword for proximity search
  transform?: string;             // e.g., "parse_currency_idr"
  default?: any;
}

interface ValidationRule {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  notFuture?: boolean;
  maxFutureDays?: number;         // Allow date up to N days in future
  pattern?: RegExp;
}
```

### Plugin Matching with Scoring

```typescript
interface MatchedPlugin {
  plugin: ParserPlugin;
  score: number;                  // Based on pattern specificity
}

// Resolution order:
// 1. Highest score wins
// 2. Tie → highest priority
// 3. Tie → newest version

function scorePlugin(plugin: ParserPlugin, email: Email): number {
  let score = 0;

  // Exact from match = +10, wildcard = +5
  for (const pattern of plugin.match.from_patterns) {
    if (pattern.includes('*')) {
      score += 5;
    } else if (email.from.toLowerCase().includes(pattern.toLowerCase())) {
      score += 10;
    }
  }

  // Subject match = +3 per pattern
  if (plugin.match.subject_patterns) {
    for (const pattern of plugin.match.subject_patterns) {
      if (email.subject.toLowerCase().includes(pattern.toLowerCase().replace(/\*/g, ''))) {
        score += 3;
      }
    }
  }

  return score;
}

function findBestMatcher(email: Email, plugins: ParserPlugin[]): MatchedPlugin | null {
  const matched = plugins
    .map(p => ({ plugin: p, score: scorePlugin(p, email) }))
    .filter(m => m.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.plugin.priority !== a.plugin.priority) return b.plugin.priority - a.plugin.priority;
      return compareVersions(b.plugin.version, a.plugin.version);
    });

  return matched[0] || null;
}
```

### Extraction Strategy Priority

Each field tries strategies in order until one succeeds:

```
1. regex → matches → transform → validate → done
2. xpath → matches → transform → validate → done
3. keyword_proximity → finds nearest keyword → extract nearby value → validate → done
4. default value → use default (skip validation)
```

**Multiple match behavior:** First successful strategy wins (ordered list).

**No match behavior:** Field is `null`, extraction log records "no match".

### ParsedResult with Metadata

```typescript
interface ParsedResult {
  data: ParsedTransaction;
  plugin_id: string;
  plugin_version: string;
  extraction_log: ExtractionLogEntry[];  // For debugging
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

interface ExtractionLogEntry {
  field: string;
  strategy_type: string;
  pattern_used?: string;
  result: 'success' | 'no_match' | 'invalid' | 'error';
  value_extracted?: any;
  error?: string;
}
```

### Example: BCA Credit Card Plugin

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
  },
  "validate": {
    "amount": { "min": 0, "max": 1000000000 },
    "date": { "notFuture": true, "maxFutureDays": 1 },
    "merchant": { "minLength": 2 }
  }
}
```

### Parser Registry

```typescript
class ParserRegistry {
  private plugins: Map<string, ParserPlugin[]>;

  register(plugin: ParserPlugin): void;
  findBestMatcher(email: Email): MatchedPlugin | null;
  getVersionedPlugin(id: string, version: string): ParserPlugin | null;
  getAllVersions(id: string): ParserPlugin[];
}
```

---

## Merchant Normalization

### Normalization Pipeline

```typescript
const NOISE_PATTERNS = [
  /^pt\.?\s*/i,
  /^tbk\.?\s*/i,
  /^cv\.?\s*/i,
  /^ud\.?\s*/i,
];

const ALIAS_MAP: Record<string, string> = {
  'gojek': 'gojek',
  'go-jek': 'gojek',
  'grab': 'grab',
  'grabtaxi': 'grab',
};

function normalizeMerchant(raw: string): string {
  let normalized = raw
    .toLowerCase()
    .replace(/[^\w\s]/g, '')      // remove symbols
    .replace(/\s+/g, ' ')         // normalize spaces
    .trim();

  // Strip noise prefixes
  for (const pattern of NOISE_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }

  // Apply aliases
  normalized = ALIAS_MAP[normalized] || normalized;

  return normalized;
}
```

This normalized form is used for:
- User learning matching
- Merchant rule matching
- Keyword scoring input

---

## Deduplication Strategy

### Dedup Key Generation

```typescript
function generateDedupKey(tx: {
  source: string;
  source_reference_id?: string;
  amount: number;
  date: string;
}): string {
  const data = [
    tx.source,
    tx.source_reference_id || '',
    tx.amount.toString(),
    tx.date.split('T')[0],  // Use date only, not time
  ].join('|');

  return hashSha256(data);
}
```

### Dedup Check Rule

```
IF dedup_key EXISTS in processed_transactions:
  SKIP insert (duplicate)
ELSE:
  INSERT new transaction
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
  alternatives?: {               // Top 2-3 alternatives
    category: string;
    confidence: number;
  }[];
}

interface CategorizationOutput {
  result: CategorizationResult;
  status: 'approved' | 'pending';  // Based on confidence threshold
}
```

### Confidence Threshold Gate

```typescript
const CONFIDENCE_THRESHOLD = 0.6;

function determineStatus(confidence: number): 'approved' | 'pending' {
  return confidence >= CONFIDENCE_THRESHOLD ? 'approved' : 'pending';
}
```

### Categorization Pipeline

#### Step 1: UserLearningMatcher (Priority 1)

```typescript
interface UserLearningEntry {
  user_id: string;
  merchant_pattern: string;       // e.g., "gojek", "*tiket.com*"
  merchant_normalized: string;    // Pre-computed normalized form
  category: string;
  confidence_override?: number;  // User can say "always use this"
  usage_count: number;           // Track confirmations for rate limiting
  created_at: Date;
  updated_at: Date;
}

// Matching: normalized merchant name or wildcard pattern
// Confidence: 0.95 (user ground truth), or confidence_override if set
// Rate limiting: apply only if usage_count >= 2 (prevents one-off errors)
```

#### Step 2: MerchantRuleMatcher (Priority 2)

```typescript
interface MerchantRule {
  id: string;
  merchant_patterns: string[];    // ["gojek", "grab", "maxim"]
  merchant_normalized: string[];  // Pre-computed normalized forms
  category: string;
  confidence: number;            // e.g., 0.85
  is_active: boolean;
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
  weight: number;                 // e.g., 2.0 for positive, -1.0 for negative
}

// Score each category by summing keyword weights
// Normalize to 0-1 confidence using improved formula:
// confidence = top_score / (top_score + second_score + 0.5)
```

Example keywords:
```
food:      { "restaurant": 2.0, "cafe": 2.0, "makan": 1.5, "food": 1.0, "grab": -1.0 }
transport: { "ride": 2.0, "trip": 2.0, "taksi": 2.0, "grab": 1.5, "gojek": 1.5 }
shopping:  { "beli": 2.0, "shop": 2.0, "store": 1.5, "mart": 1.0 }
travel:    { "flight": 2.0, "hotel": 2.0, "tiket": 2.0, "pesawat": 2.0 }
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
): CategorizationOutput {
  // 1. Check user learning (with rate limiting: usage_count >= 2)
  const userMatch = userLearningMatcher.match(userId, tx.merchant_normalized);
  if (userMatch && userMatch.usage_count >= 2) {
    const confidence = userMatch.confidence_override || 0.95;
    return {
      result: {
        category: userMatch.category,
        confidence,
        source: 'user_learning'
      },
      status: determineStatus(confidence)
    };
  }

  // 2. Check merchant rules
  const ruleMatch = merchantRuleMatcher.match(tx.merchant_normalized);
  if (ruleMatch) {
    const result: CategorizationResult = {
      category: ruleMatch.category,
      confidence: ruleMatch.confidence,
      source: 'merchant_rule'
    };
    return { result, status: determineStatus(ruleMatch.confidence) };
  }

  // 3. Keyword scoring
  const scores = keywordScorer.score(tx);
  if (scores.topScore > 0) {
    const result: CategorizationResult = {
      category: scores.topCategory,
      confidence: scores.normalizedConfidence,
      source: 'keyword_score',
      alternatives: scores.alternatives
    };
    return { result, status: determineStatus(scores.normalizedConfidence) };
  }

  // 4. Source default
  const sourceDefault = SOURCE_DEFAULTS[tx.source] || { category: 'other', confidence: 0.1 };
  const result: CategorizationResult = {
    ...sourceDefault,
    source: 'default'
  };
  return { result, status: determineStatus(sourceDefault.confidence) };
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
        ├── merchant_normalized: string
        ├── category: string
        ├── confidence_override?: number
        ├── usage_count: number           // For rate limiting
        ├── created_at: Timestamp
        └── updated_at: Timestamp

parsers/{parserId}/versions/{versionId}
  ├── ...ParserPlugin fields
  └── created_at: Timestamp

merchant_rules/{ruleId}
  ├── merchant_patterns: string[]
  ├── merchant_normalized: string[]
  ├── category: string
  ├── confidence: number
  └── is_active: boolean

// Index collection for cross-user merchant lookups (future-proofing)
merchant_learning_index/{merchant_normalized}
  └── users: Array<{
        user_id: string
        learning_id: string
      }>
```

### Transaction Document (existing, updated)

```typescript
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  merchant: string;
  merchant_normalized: string;    // NEW: pre-computed
  date: string;
  categories: string[];            // Single category for now
  category_confidence: number;     // NEW: confidence score
  category_source: string;        // NEW: 'user_learning' | 'merchant_rule' | etc
  source: TransactionSource;
  parser_id: string;               // NEW: parser used
  parser_version: string;          // NEW: version used
  dedup_key: string;               // NEW: deduplication
  messageId?: string;
  createdAt: string;
}
```

---

## API Contracts

### Email Scan API (existing, updated)

```typescript
// POST /api/emails/scan
// Request: { forceRefresh?: boolean, reprocessFailed?: boolean }
// Response:
{
  processed: number;
  new_transactions: number;
  skipped_duplicates: number;
  failed: number;
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

### Reprocessing API

```typescript
// POST /api/transactions/reprocess
// Request: { transactionIds?: string[], reprocessFailed?: boolean }
// Behavior:
//   - If transactionIds provided: reprocess those specifically
//   - If reprocessFailed true: reprocess all with status 'failed'
//   - Only reprocess if parser_version_used !== current_version
// Response: { reprocessed: number, results: [...] }
```

### Categorization Feedback API

```typescript
// POST /api/transactions/{id}/categorize
// Request: { category: string, confidence_override?: number }
// Response: { success: true, learning_id: string }

// This creates/updates user_learning entry
// Also increments usage_count
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
- [ ] Plugin matching with scoring + priority
- [ ] Migrate existing parsers to plugin format
- [ ] Multi-strategy extraction support
- [ ] Validation rules per field
- [ ] Extraction logging
- [ ] Plugin storage in Firestore
- [ ] Merchant normalization pipeline

### Phase 2: Categorization Pipeline
- [ ] CategorizationResult interface
- [ ] UserLearningMatcher with rate limiting (usage_count >= 2)
- [ ] MerchantRuleMatcher with normalized matching
- [ ] KeywordScorer with improved confidence formula
- [ ] Pipeline orchestration
- [ ] Confidence threshold gate (0.6)
- [ ] Alternatives in output

### Phase 3: Deduplication & Data Quality
- [ ] Dedup key generation
- [ ] Dedup check before insert
- [ ] Parser version tracking per transaction
- [ ] Reprocessing API

### Phase 4: Learning Loop
- [ ] User feedback collection
- [ ] user_learning collection writes
- [ ] Confidence override support
- [ ] Usage count tracking
- [ ] merchant_learning_index (future-proofing)

### Phase 5: Admin & Debugging
- [ ] Merchant rules CRUD
- [ ] Parser version management
- [ ] Confidence debugging UI
- [ ] Parsing failure analytics
- [ ] Extraction log viewer

---

## Open Questions (RESOLVED)

1. **Learning TTL**: Keep forever, allow overwrite via new user action. No automatic decay.

2. **Prompt on low confidence?**:
   ```typescript
   if (confidence < 0.6 && source !== 'user_learning'):
     status = 'pending'  // User prompted
   ```

3. **Multi-category?**: No (for now). Single category only. Can add tags later.

4. **Plugin update reprocessing?**:
   - Optional + user-triggered via `/api/transactions/reprocess`
   - Background reprocess for *failed parses only*

---

## Alternatives Considered

### Regex-Only Parsing
**Rejected**: Too fragile for production. HTML structure and localized formats break easily.

### ML-Based Categorization
**Deferred**: Overkill for MVP. Can add later using same confidence output interface.

### Global Learning (all users benefit)
**Deferred**: Requires privacy analysis, data anonymization. Per-user learning first.

### Original Keyword Scorer Formula
**Fixed**: Original `confidence = top_score / (top_score + 1.0)` ignored second-best category. New formula `confidence = top_score / (top_score + second_score + 0.5)` properly reflects ambiguity.