import { BottomNav } from '@/components/ui/BottomNav';
import { Sidebar } from '@/components/ui/Sidebar';
import { SessionWrapper } from '@/components/providers/SessionWrapper';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionWrapper>
      <div
        className="min-h-screen md:pl-64 flex flex-col"
        style={{ background: 'var(--bg-base)' }}
      >
        <Sidebar />
        <div className="flex-1 w-full">
          {children}
        </div>
        <BottomNav />
      </div>
    </SessionWrapper>
  );
}