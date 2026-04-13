import type { ParsedEmail } from './index';

interface TravelokaEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseTravelokaEmail(email: TravelokaEmail): ParsedEmail | null {
  const amountMatch = email.body.match(/Rp[\s]?([\d,\.]+)/);
  const merchantMatch = email.subject.match(/(Flight|Hotel|Activity)/);
  const dateMatch = email.body.match(/(\d{1,2}\s+\w+\s+\d{4})/);

  if (!amountMatch) return null;

  const category: string = email.subject.toLowerCase().includes('hotel') 
    ? 'food' 
    : email.subject.toLowerCase().includes('flight')
    ? 'transport'
    : 'other';

  return {
    amount: parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10),
    merchant: merchantMatch ? `Traveloka - ${merchantMatch[1]}` : 'Traveloka',
    date: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
    categories: [category],
    source: 'traveloka',
  };
}
