'use server';

// apps/web/src/features/delete-shopping-item/api/actions.ts
// Phase 5 §3.7 / §4.1 — features/delete-shopping-item Server Action.
//
// shopping_list DELETE WHERE id=$id. RLS 가 user_id 격리 보장.
//
// ★ DB 자동 생성 타입에 0016 객체 미반영 → untyped supabase client cast.

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { err, ok, type Result } from '@/shared/lib/result';

const InputSchema = z.object({
  id: z.string().uuid(),
});

export async function deleteShoppingItem(
  id: string,
): Promise<Result<void, string>> {
  const parsed = InputSchema.safeParse({ id });
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
    .delete()
    .eq('id', parsed.data.id);

  if (error) {
    console.error('[deleteShoppingItem] delete failed', error);
    return err('항목 삭제에 실패했습니다');
  }

  revalidatePath('/shopping');
  return ok(undefined);
}
