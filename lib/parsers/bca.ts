import type { ParsedEmail } from './index';

interface BCAEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseBCAEmail(email: BCAEmail): ParsedEmail | null {
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
  
  let category: string = 'other';
   
  if (isCreditCard) {
    category = 'other';
  } else if (typeLower.includes('debit') || typeLower.includes('transfer')) {
    category = 'transport';
  }

  const date = dateMatch ? new Date(dateMatch[1].replace(/(\d{2})\s+(\w+)\s+(\d{4})/, '$2 $1, $3')).toISOString() : new Date().toISOString();

  const companyMatch = email.body.match(/Company\/Product Name\s*:\s*(.+)/);
  const merchant = companyMatch ? companyMatch[1].trim() : 'BCA';

  return {
    amount,
    merchant,
    date,
    categories: [category],
    source: 'bca',
  };
}