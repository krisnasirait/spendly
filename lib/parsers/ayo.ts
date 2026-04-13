import type { ParsedEmail } from './index';

interface AyoEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseAyoEmail(email: AyoEmail): ParsedEmail | null {
  const amountMatch = email.body.match(/(?:Total Bayar)\s*[:\s]*Rp\s*([\d,\.]+)/);
  const merchantMatch = email.body.match(/(?:Ayo\.co\.id|Ayo Indonesia|Mabar All Level)/);
  const dateMatch = email.body.match(/(\d{1,2}\s+\w+\s+\d{4})/);

  if (!amountMatch) return null;

  const date = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

  const merchant = merchantMatch 
    ? merchantMatch[0].includes('Mabar') ? 'AYO Indonesia - Badminton' : merchantMatch[0].trim()
    : 'AYO Indonesia';

  return {
    amount: parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10),
    merchant,
    date,
    categories: ['entertainment'],
    source: 'ayo',
  };
}
