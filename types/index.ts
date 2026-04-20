export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  merchant: string;
  merchant_normalized: string;
  date: string;
  category: string;
  category_confidence: number;
  category_source: string;
  category_reason?: string;
  source: 'shopee' | 'tokopedia' | 'traveloka' | 'bca' | 'ayo' | 'jago' | 'bni';
  parser_id: string;
  parser_version: string;
  dedup_key: string;
  parsing_status: 'success' | 'partial' | 'failed';
  createdAt: string;
  messageId?: string;
}

export interface PendingTransaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  source: 'shopee' | 'tokopedia' | 'traveloka' | 'bca' | 'ayo' | 'jago' | 'bni';
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
