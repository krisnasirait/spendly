export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  merchant: string;
  date: string;
  categories: string[];
  source: 'shopee' | 'tokopedia' | 'traveloka' | 'bca' | 'ayo';
  createdAt: string;
  messageId?: string;
}

export interface PendingTransaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  categories: string[];
  source: 'shopee' | 'tokopedia' | 'traveloka' | 'bca' | 'ayo';
  messageId: string;
  createdAt: string;
  status: 'pending';
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  budget?: number;
  createdAt: Date;
}

export interface Insight {
  id: string;
  userId: string;
  type: 'spike' | 'trend' | 'category_overload' | 'pattern' | 'encouragement' | 'budget_alert' | 'unusual_tx';
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

export interface Budget {
  category: string;
  amount: number;
  period: 'monthly';
  suggestedAmount?: number;
  isManual: boolean;
}
