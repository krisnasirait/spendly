import type { ParsedEmail } from './index';

interface JagoEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseJagoEmail(email: JagoEmail): ParsedEmail | null {
  const amountMatch = email.body.match(/Rp\s*([\d,\.]+)/);
  const merchantMatch = email.body.match(/To[\s\n]+([^\n]+)/);
  const dateMatch = email.body.match(/(\d{1,2}\s+\w+\s+\d{4})/);

  if (!amountMatch) return null;

  const date = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

  const merchant = merchantMatch ? merchantMatch[1].trim() : 'Jago';

  return {
    amount: parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10),
    merchant,
    date,
    categories: ['other'],
    source: 'jago',
  };
}