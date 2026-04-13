import type { ParsedEmail } from './index';

interface TokopediaEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseTokopediaEmail(email: TokopediaEmail): ParsedEmail | null {
  const amountMatch = email.body.match(/Rp[\s]?([\d,\.]+)/);
  const merchantMatch = email.body.match(/Penjual:\s*(.+)/);
  const dateMatch = email.body.match(/(\d{1,2}\s+\w+\s+\d{4})/);

  if (!amountMatch) return null;

  return {
    amount: parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10),
    merchant: merchantMatch ? merchantMatch[1].trim() : 'Tokopedia',
    date: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
    categories: ['shopping'],
    source: 'tokopedia',
  };
}