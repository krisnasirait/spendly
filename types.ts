export type Category = 'shopping' | 'food' | 'transport' | 'other' | 'entertainment';

export type InsightType = 'spike' | 'trend' | 'category_overload' | 'pattern' | 'encouragement';

export interface Insight {
  id?: string;
  type: InsightType;
  text: string;
  createdAt: Date;
}

export interface Transaction {
  id?: string;
  amount: number;
  merchant: string;
  date: Date;
  category: Category;
  source: 'shopee' | 'tokopedia' | 'traveloka';
}
