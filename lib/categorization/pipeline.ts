import type { CategorizationOutput, CategorizationResult } from './types';
import { determineStatus } from './types';
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