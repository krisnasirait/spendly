import { parseShopeeEmail } from './shopee';
import { parseTokopediaEmail } from './tokopedia';
import { parseTravelokaEmail } from './traveloka';
import { Transaction } from '@/types';

export interface ParsedEmail {
  amount: number;
  merchant: string;
  date: string;
  categories: string[];
  source: Transaction['source'];
}

export function parseEmail(email: { subject: string; body: string; from: string }): ParsedEmail | null {
  const from = email.from.toLowerCase();
  
  if (from.includes('shopee')) {
    return parseShopeeEmail(email) as ParsedEmail | null;
  }
  if (from.includes('tokopedia')) {
    return parseTokopediaEmail(email) as ParsedEmail | null;
  }
  if (from.includes('traveloka')) {
    return parseTravelokaEmail(email) as ParsedEmail | null;
  }
  
  return null;
}