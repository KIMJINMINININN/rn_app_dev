import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';

export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  redirect('/inventory');
}
