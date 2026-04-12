export type Category = 'shopping' | 'food' | 'transport' | 'other' | 'entertainment';

export interface Transaction {
  id?: string;
  amount: number;
  merchant: string;
  date: Date;
  category: Category;
  source: 'shopee' | 'tokopedia' | 'traveloka';
}
