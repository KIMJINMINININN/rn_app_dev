import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { AppHeader } from '@/widgets/app-shell/app-header';
import { BottomNav } from '@/widgets/app-shell/bottom-nav';

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 pb-56">{children}</main>
      <BottomNav />
    </div>
  );
}
