import type { Transaction } from '@/types';

interface BCAEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseBCAEmail(email: BCAEmail): Partial<Transaction> | null {
  const dateMatch = email.body.match(/Transaction Date\s*:\s*(\d{2}\s+\w+\s+\d{4})/);
  const typeMatch = email.body.match(/Transaction Type\s*:\s*(.+)/);
  
  const typeLower = typeMatch ? typeMatch[1].toLowerCase() : '';
  const isCreditCard = typeLower.includes('credit card') || typeLower.includes('paylater');
  
  let amount: number;
  
  if (isCreditCard) {
    const paymentMatch = email.body.match(/Total Payment\s*:\s*IDR\s*([\d,\.]+)/);
    if (paymentMatch) {
      amount = parseFloat(paymentMatch[1].replace(/,/g, ''));
    } else {
      const billMatch = email.body.match(/Total Bill\s*:\s*IDR\s*([\d,\.]+)/);
      if (!billMatch) return null;
      amount = parseFloat(billMatch[1].replace(/,/g, ''));
    }
  } else {
    const amountMatch = email.body.match(/(?:Total Bill|Total Payment)\s*:\s*IDR\s*([\d,\.]+)/);
    if (!amountMatch) return null;
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  let category: Transaction['category'] = 'other';
  
  if (isCreditCard) {
    category = 'other';
  } else if (typeLower.includes('debit') || typeLower.includes('transfer')) {
    category = 'transport';
  }

  const date = dateMatch ? new Date(dateMatch[1].replace(/(\d{2})\s+(\w+)\s+(\d{4})/, '$2 $1, $3')) : new Date();

  return {
    amount,
    merchant: 'BCA',
    date,
    category,
    source: 'bca',
  };
}