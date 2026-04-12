import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Category } from '@/types';

interface CategoryData {
  category: Category;
  amount: number;
}

const colorMap: Record<Category, string> = {
  food:          '#f59e0b',
  shopping:      '#ec4899',
  transport:     '#38bdf8',
  entertainment: '#a3e635',
  other:         '#94a3b8',
};

const emojiMap: Record<Category, string> = {
  food:          '🍔',
  shopping:      '🛍️',
  transport:     '🚗',
  entertainment: '🎮',
  other:         '📦',
};

interface CategoryPieProps {
  data: CategoryData[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(item.value);

  return (
    <div
      style={{
        background: 'rgba(15, 22, 41, 0.95)',
        border: `1px solid ${item.payload.fill}55`,
        borderRadius: 12,
        padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 24px ${item.payload.fill}33`,
      }}
    >
      <p style={{ color: item.payload.fill, fontWeight: 700, fontSize: 13 }}>
        {item.name}
      </p>
      <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, marginTop: 2 }}>
        {formatted}
      </p>
    </div>
  );
};

export function CategoryPie({ data }: CategoryPieProps) {
  const chartData = data.map((item) => ({
    name: `${emojiMap[item.category]} ${item.category}`,
    value: item.amount,
    fill: colorMap[item.category],
  }));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill}
                style={{ filter: `drop-shadow(0 0 6px ${entry.fill}88)` }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
