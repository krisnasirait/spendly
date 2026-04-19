import type { KeywordScore, KeywordScores } from '../types';

export class KeywordScorer {
  private keywords: KeywordScore[] = [
    { keyword: 'restaurant', category: 'food', weight: 2.0 },
    { keyword: 'cafe', category: 'food', weight: 2.0 },
    { keyword: 'makan', category: 'food', weight: 1.5 },
    { keyword: 'food', category: 'food', weight: 1.0 },
    { keyword: 'starbucks', category: 'food', weight: 2.0 },
    { keyword: 'mcdonalds', category: 'food', weight: 2.0 },
    { keyword: 'kfc', category: 'food', weight: 2.0 },
    { keyword: 'burger', category: 'food', weight: 1.5 },
    { keyword: 'pizza', category: 'food', weight: 1.5 },

    { keyword: 'ride', category: 'transport', weight: 2.0 },
    { keyword: 'trip', category: 'transport', weight: 2.0 },
    { keyword: 'taksi', category: 'transport', weight: 2.0 },
    { keyword: 'taxi', category: 'transport', weight: 2.0 },
    { keyword: 'gojek', category: 'transport', weight: 1.5 },
    { keyword: 'grab', category: 'transport', weight: 1.5 },
    { keyword: 'maxim', category: 'transport', weight: 1.5 },

    { keyword: 'beli', category: 'shopping', weight: 2.0 },
    { keyword: 'shop', category: 'shopping', weight: 2.0 },
    { keyword: 'store', category: 'shopping', weight: 1.5 },
    { keyword: 'mart', category: 'shopping', weight: 1.0 },
    { keyword: 'toko', category: 'shopping', weight: 1.0 },

    { keyword: 'flight', category: 'travel', weight: 2.0 },
    { keyword: 'hotel', category: 'travel', weight: 2.0 },
    { keyword: 'tiket', category: 'travel', weight: 2.0 },
    { keyword: 'pesawat', category: 'travel', weight: 2.0 },
    { keyword: 'traveloka', category: 'travel', weight: 1.5 },

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