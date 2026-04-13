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
  const dateMatch = email.body.match(/(\d{1,2}\s+\w+\s+\d{4})/);

  if (!amountMatch) return null;

  return {
    amount: parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10),
    merchant: penjualMatch ? penjualMatch[1].trim() : (merchantMatch ? merchantMatch[1].trim() : 'Shopee'),
    date: dateMatch ? new Date(dateMatch[1]) : new Date(),
    category: 'shopping' as Category,
    source: 'shopee',
  };
}
