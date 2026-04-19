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

export interface MatchedPlugin {
  plugin: ParserPlugin;
  score: number;
}