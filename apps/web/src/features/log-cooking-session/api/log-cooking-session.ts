'use server';

// apps/web/src/features/log-cooking-session/api/log-cooking-session.ts
// Phase 4 §3.2 / §4.1 — features/log-cooking-session Server Action.
//
// `log_cooking_session` (0019 RPC, 원래 0015b — supabase CLI 호환 위해 rename)
// 단일 호출로 cooking_history INSERT + user_ingredients 부분 차감을 원자적으로
// 수행한다. 본 파일은 RPC 호출 + 권한 검증 + 한국어 에러 변환 + revalidatePath만 담당.
//
// ★ Database 자동 생성 타입(`db:types`)에 0014 / 0019 객체가 아직 없어
//   호출 사이트에서 untyped supabase client 캐스트를 사용한다 (Phase 3 Day 7
//   `recipes/page.tsx`, list-recommendations queries.ts 와 동일 패턴).
//
// 후속 (Day 5/6) UI에서 mutation onSuccess 시 invalidate 대상 (conventions §17.2):
//   ['cooking-history'], ['ingredients'], ['inventory-summary']
// 본 Server Action은 RSC 페이지 캐시 무효화만 담당 (revalidatePath).

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { err, ok, type Result } from '@/shared/lib/result';

const ConsumedItemSchema = z.object({
  master_id: z.string().uuid(),
  quantity: z.coerce.number().nonnegative(),
  unit: z.string().min(1),
});

const InputSchema = z
  .object({
    recipeId: z.string().uuid().nullable(),
    customRecipeName: z.string().min(1).max(120).nullable(),
    consumed: z.array(ConsumedItemSchema),
    rating: z.number().int().min(1).max(5).nullable(),
    memo: z.string().max(500).nullable(),
  })
  .refine(
    (v) => v.recipeId !== null || (v.customRecipeName ?? '').trim().length > 0,
    { message: '레시피를 선택하거나 직접 입력한 요리 이름이 필요합니다' },
  );

export type LogCookingInput = z.input<typeof InputSchema>;

export async function logCookingSession(
  input: LogCookingInput,
): Promise<Result<{ sessionId: string }, string>> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? '입력 검증 실패');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return err('세션이 만료되었습니다. 다시 로그인하세요.');
  }

  // RPC `log_cooking_session` 가 db:types 에 없어 untyped cast 우회 (Phase 3 일관).
  const untypedClient = supabase as unknown as SupabaseClient;
  const { data, error } = await untypedClient.rpc('log_cooking_session', {
    p_user: user.id,
    p_recipe_id: parsed.data.recipeId,
    p_custom_recipe_name: parsed.data.customRecipeName,
    p_consumed: parsed.data.consumed,
    p_rating: parsed.data.rating,
    p_memo: parsed.data.memo,
  });

  if (error) {
    // 0019 본문: `raise exception 'unauthorized: auth.uid() mismatch'`
    if (
      typeof error.message === 'string' &&
      error.message.includes('unauthorized: auth.uid() mismatch')
    ) {
      return err('세션이 만료되었습니다. 다시 로그인하세요.');
    }
    console.error('[logCookingSession] RPC failed', error);
    return err('요리 기록 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
  }

  if (typeof data !== 'string' || data.length === 0) {
    console.error('[logCookingSession] RPC returned unexpected payload', data);
    return err('요리 기록 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
  }

  // RSC 캐시 무효화 (Day 6 cooking-history 페이지 / inventory 차감 반영).
  revalidatePath('/cooking-history');
  revalidatePath('/inventory');

  return ok({ sessionId: data });
}
