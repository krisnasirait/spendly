import { Card } from '@/components/ui/Card';
import { CategoryPie } from '@/components/charts/CategoryPie';
import type { Category } from '@/types';

interface CategoryBreakdownProps {
  categories: { category: Category; amount: number }[];
}

const emojiMap: Record<Category, string> = {
  food: '🍔',
  shopping: '🛍️',
  transport: '🚗',
  entertainment: '🎮',
  other: '📦',
};

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <div className="space-y-4">
      <CategoryPie data={categories} />
      <div className="space-y-3">
        {categories.map(({ category, amount }) => {
          const formatted = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(amount);
          
          return (
            <Card key={category} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{emojiMap[category]}</span>
                <span className="font-medium capitalize">{category}</span>
              </div>
              <span className="font-semibold text-gray-900">{formatted}</span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
