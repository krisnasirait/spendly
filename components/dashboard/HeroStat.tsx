import { Card } from '@/components/ui/Card';

interface HeroStatProps {
  amount: number;
  month: string;
}

export function HeroStat({ amount, month }: HeroStatProps) {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

  return (
    <Card className="text-center mb-6">
      <p className="text-5xl font-bold text-gray-900 tracking-tight">
        {formatted}
      </p>
      <p className="text-gray-500 mt-2">Spent this {month}</p>
    </Card>
  );
}
