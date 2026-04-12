export function LoadingSkeleton({
  className = '',
  height = 'h-5',
}: {
  className?: string;
  height?: string;
}) {
  return <div className={`skeleton ${height} ${className}`} />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div
      className="rounded-2xl p-5 mb-3 animate-fade-in"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton h-10 w-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-1/3" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-3 mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div
      className="rounded-3xl p-8 mb-6 animate-fade-in"
      style={{
        background: 'rgba(124,58,237,0.1)',
        border: '1px solid rgba(139,92,246,0.2)',
      }}
    >
      <div className="skeleton h-3 w-24 mx-auto mb-6" />
      <div className="skeleton h-12 w-48 mx-auto mb-3" />
      <div className="skeleton h-3 w-32 mx-auto" />
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="space-y-2 animate-fade-in">
      <div className="skeleton h-3 w-20 mb-4" />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="skeleton h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-2.5 w-1/4" />
          </div>
          <div className="skeleton h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
