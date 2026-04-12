import { Card } from './Card';
import type { Insight } from '@/types';

interface InsightCardProps {
  insight: Insight;
}

const emojiMap: Record<Insight['type'], string> = {
  spike: '🚨',
  trend: '📈',
  category_overload: '🍔',
  pattern: '🔍',
  encouragement: '✨',
};

export function InsightCard({ insight }: InsightCardProps) {
  const emoji = emojiMap[insight.type];
  
  return (
    <Card accent="warning" className="mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="text-gray-900 font-medium leading-relaxed">{insight.text}</p>
          <p className="text-xs text-gray-400 mt-2">
            {insight.createdAt.toLocaleDateString('id-ID', { 
              day: 'numeric', 
              month: 'short' 
            })}
          </p>
        </div>
      </div>
    </Card>
  );
}