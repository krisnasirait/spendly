import type { ParsedEmail } from './index';

interface BCAEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseBCAEmail(email: BCAEmail): ParsedEmail | null {
  const subjectLower = email.subject.toLowerCase();
  const isReversalVoid = subjectLower.includes('reversal') || subjectLower.includes('void');
  if (isReversalVoid) return null;

  const isCreditCardNotification = subjectLower.includes('credit card transaction notification');

  let amount: number;
  let date: string;
  let merchant: string;
  let category: string = 'other';

  if (isCreditCardNotification) {
    const dateMatch = email.body.match(/Pada Tanggal\s*:\s*(\d{2}-\d{2}-\d{4})\s*(\d{2}:\d{2}:\d{2})\s*WIB/);
    if (dateMatch) {
      const [_, datePart, timePart] = dateMatch;
      const [day, month, year] = datePart.split('-');
      date = new Date(`${year}-${month}-${day}T${timePart}:00.000Z`).toISOString();
    } else {
      date = new Date().toISOString();
    }

    const amountMatch = email.body.match(/Sejumlah\s*:\s*Rp\.?([\d,\.]+)/);
    if (!amountMatch) return null;
    amount = parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10);

    const merchantMatch = email.body.match(/Merchant\s*\/ ATM\s*:\s*(.+)/);
    merchant = merchantMatch ? merchantMatch[1].trim() : 'BCA';

  } else {
    const dateMatch = email.body.match(/Transaction Date\s*:\s*(\d{2}\s+\w+\s+\d{4})/);
    const typeMatch = email.body.match(/Transaction Type\s*:\s*(.+)/);

    const typeLower = typeMatch ? typeMatch[1].toLowerCase() : '';
    const isCreditCard = typeLower.includes('credit card') || typeLower.includes('paylater');

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

    if (typeLower.includes('debit') || typeLower.includes('transfer')) {
      category = 'transport';
    }

    date = dateMatch ? new Date(dateMatch[1].replace(/(\d{2})\s+(\w+)\s+(\d{4})/, '$2 $1, $3')).toISOString() : new Date().toISOString();

    const companyMatch = email.body.match(/Company\/Product Name\s*:\s*(.+)/);
    merchant = companyMatch ? companyMatch[1].trim() : 'BCA';
  }

  return {
    amount,
    merchant,
    date,
    categories: [category],
    source: 'bca',
  };
}