import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Category } from '@/types';

interface CategoryData {
  category: Category;
  amount: number;
  emoji?: string;
}

const colorMap: Record<Category, string> = {
  food: '#fde68a',
  shopping: '#fbcfe8',
  transport: '#bae6fd',
  entertainment: '#d9f99d',
  other: '#e5e5e5',
};

const emojiMap: Record<Category, string> = {
  food: '🍔',
  shopping: '🛍️',
  transport: '🚗',
  entertainment: '🎮',
  other: '📦',
};

interface CategoryPieProps {
  data: CategoryData[];
}

export function CategoryPie({ data }: CategoryPieProps) {
  const chartData = data.map((item) => ({
    name: `${emojiMap[item.category]} ${item.category}`,
    value: item.amount,
    fill: colorMap[item.category],
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(value as number)
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
