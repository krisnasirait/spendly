const colorPalette = [
  '#7C6CF8', '#A78BFA', '#60A5FA', '#34D399', '#FBBF24',
  '#F472B6', '#FB923C', '#A3A3A3', '#6366F1', '#EC4899',
  '#14B8A6', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444',
];

const categoryColorCache = new Map<string, string>();

export function getCategoryColor(categoryName: string): string {
  if (categoryColorCache.has(categoryName)) {
    return categoryColorCache.get(categoryName)!;
  }
  const hash = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colorPalette[hash % colorPalette.length];
  categoryColorCache.set(categoryName, color);
  return color;
}

export function getCategoryColorWithBg(categoryName: string): { color: string; bg: string } {
  const color = getCategoryColor(categoryName);
  return { color, bg: `${color}20` };
}
