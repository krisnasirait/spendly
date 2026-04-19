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
