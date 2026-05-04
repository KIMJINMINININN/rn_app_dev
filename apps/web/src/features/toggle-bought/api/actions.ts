'use server';

// apps/web/src/features/toggle-bought/api/actions.ts
// Phase 5 §3.6 / §4.1 — features/toggle-bought Server Action.
//
// shopping_list.bought boolean flip. RLS 가 user_id 검증 담당 (db-schema §4.1 패턴).
//
// ★ DB 자동 생성 타입에 0016 객체 미반영 → untyped supabase client cast.

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { err, ok, type Result } from '@/shared/lib/result';

const InputSchema = z.object({
  id: z.string().uuid(),
  bought: z.boolean(),
});

export async function toggleBought(
  id: string,
  bought: boolean,
): Promise<Result<void, string>> {
  const parsed = InputSchema.safeParse({ id, bought });
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? '입력 검증 실패');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err('로그인이 필요합니다');

  const untyped = supabase as unknown as SupabaseClient;

  const { error } = await untyped
    .from('shopping_list')
    .update({ bought: parsed.data.bought })
    .eq('id', parsed.data.id);

  if (error) {
    console.error('[toggleBought] update failed', error);
    return err('상태 변경에 실패했습니다');
  }

  revalidatePath('/shopping');
  return ok(undefined);
}
