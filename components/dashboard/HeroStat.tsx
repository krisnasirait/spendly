interface HeroStatProps {
  amount: number;
  month: string;
  userName?: string;
}

export function HeroStat({ amount, month, userName }: HeroStatProps) {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="relative mb-6 animate-scale-in">
      {/* Ambient glow orbs */}
      <div
        className="orb orb-violet"
        style={{ width: 260, height: 260, top: -60, left: -60, opacity: 0.6 }}
      />
      <div
        className="orb orb-rose"
        style={{ width: 200, height: 200, top: -20, right: -40, opacity: 0.5 }}
      />

      {/* Card */}
      <div
        className="relative rounded-3xl p-7 overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(236,72,153,0.12) 100%)',
          border: '1px solid rgba(139,92,246,0.35)',
          boxShadow:
            '0 8px 40px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Inner mesh overlay */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.12) 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 text-center">
          {/* Greeting */}
          {userName && (
            <p className="text-sm font-medium mb-1" style={{ color: 'rgba(167,139,250,0.8)' }}>
              {greeting}, {userName.split(' ')[0]} 👋
            </p>
          )}

          {/* Label */}
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Spent in {month}
          </p>

          {/* Amount */}
          <p
            className="font-extrabold tracking-tight leading-none mb-2"
            style={{
              fontSize: 'clamp(2rem, 10vw, 3rem)',
              background: 'linear-gradient(135deg, #f1f5f9 30%, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {formatted}
          </p>

          {/* Divider pill */}
          <div className="flex justify-center mt-4">
            <div
              className="h-0.5 w-16 rounded-full"
              style={{ background: 'linear-gradient(90deg, #7c3aed, #ec4899)' }}
            />
          </div>

          {/* Sub-label */}
          <p className="text-xs mt-3 font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>
            ✦ Keep tracking your spend
          </p>
        </div>
      </div>
    </div>
  );
}
