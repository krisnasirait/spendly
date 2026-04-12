import { BottomNav } from '@/components/ui/BottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      {children}
      <BottomNav />
    </div>
  );
}