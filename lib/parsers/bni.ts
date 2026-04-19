import type { ParsedEmail } from './index';

interface BNIEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseBNIEmail(email: BNIEmail): ParsedEmail | null {
  const subjectLower = email.subject.toLowerCase();
  const bodyLower = email.body.toLowerCase();

  if (!bodyLower.includes('bni') && !email.from.includes('bni')) return null;

  if (subjectLower.includes('top-up') || subjectLower.includes('topup')) {
    const dateMatch = email.body.match(/Tanggal\s+(\d{1,2}\s+\w+\s+\d{4})/);
    const amountMatch = email.body.match(/Nominal\s+Rp([\d,\.]+)/);

    if (!amountMatch) return null;

    const date = dateMatch
      ? new Date(dateMatch[1]).toISOString()
      : new Date().toISOString();

    return {
      amount: parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10),
      merchant: 'TapCash',
      date,
      categories: ['transport'],
      source: 'bni',
    };
  }

  return null;
}