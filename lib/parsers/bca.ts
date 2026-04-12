import type { Transaction } from '@/types';

interface BCAEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseBCAEmail(email: BCAEmail): Partial<Transaction> | null {
  const amountMatch = email.body.match(/Total Payment\s*:\s*IDR\s*([\d,\.]+)/);
  const dateMatch = email.body.match(/Transaction Date\s*:\s*(\d{2}\s+\w+\s+\d{4})/);
  const typeMatch = email.body.match(/Transaction Type\s*:\s*(.+)/);

  if (!amountMatch) return null;

  const amount = parseInt(amountMatch[1].replace(/[,.]/g, ''), 10);
  
  let category: Transaction['category'] = 'other';
  const typeLower = typeMatch ? typeMatch[1].toLowerCase() : '';
  
  if (typeLower.includes('credit card') || typeLower.includes('paylater')) {
    category = 'other';
  } else if (typeLower.includes('debit') || typeLower.includes('transfer')) {
    category = 'transport';
  }

  const date = dateMatch ? new Date(dateMatch[1].replace(/(\d{2})\s+(\w+)\s+(\d{4})/, '$2 $1, $3')) : new Date();

  return {
    amount,
    merchant: 'BCA Payment',
    date,
    category,
    source: 'bca',
  };
}