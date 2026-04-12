export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  merchant: string;
  date: Date;
  category: Category;
  source: 'shopee' | 'tokopedia' | 'traveloka';
  createdAt: Date;
}

export type Category = 'food' | 'shopping' | 'transport' | 'entertainment' | 'other';

export interface Insight {
  id: string;
  userId: string;
  type: 'spike' | 'trend' | 'category_overload' | 'pattern' | 'encouragement';
  text: string;
  severity: 'high' | 'medium' | 'low';
  createdAt: Date;
  expiresAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  lastScanAt: Date | null;
}
