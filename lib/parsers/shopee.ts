import { Category, Transaction } from '@/types';

interface ShopeeEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseShopeeEmail(email: ShopeeEmail): Partial<Transaction> | null {
  const amountMatch = email.body.match(/(?:Total Pembayaran|Total Payment)\s*:\s*Rp\s*([\d,\.]+)/);
  const penjualMatch = email.body.match(/Penjual:\s*(.+)/);
  const merchantMatch = email.body.match(/Toko:\s*(.+)/);
  const dateMatch = email.body.match(/(\d{2}\/\d{2}\/\d{4})/);

  if (!amountMatch) return null;

  const date = dateMatch ? (() => {
    const [day, month, year] = dateMatch[1].split('/');
    return new Date(`${year}-${month}-${day}`);
  })() : new Date();

  return {
    amount: parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10),
    merchant: penjualMatch ? penjualMatch[1].trim() : (merchantMatch ? merchantMatch[1].trim() : 'Shopee'),
    date,
    category: 'shopping' as Category,
    source: 'shopee',
  };
}
