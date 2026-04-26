import { createSupabaseAdminClient } from '@/shared/api/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();

  let supabaseStatus: 'ok' | 'error' = 'ok';
  let supabaseError: string | undefined;

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (error) {
      supabaseStatus = 'error';
      supabaseError = error.message;
    }
  } catch (e) {
    supabaseStatus = 'error';
    supabaseError = e instanceof Error ? e.message : String(e);
  }

  const ok = supabaseStatus === 'ok';

  return Response.json(
    {
      status: ok ? 'ok' : 'degraded',
      latencyMs: Date.now() - startedAt,
      services: {
        supabase: { status: supabaseStatus, error: supabaseError },
      },
    },
    { status: ok ? 200 : 503 },
  );
}
