'use server';

// apps/web/src/features/manual-add-shopping/api/actions.ts
// Phase 5 §3.4 / §4.1 — features/manual-add-shopping Server Action.
//
// 흐름:
//   1) auth check
//   2) input.name 검증 (필수, 1~80자)
//   3) shopping_list INSERT (source='manual', custom_name=name, ingredient_master_id=null)
//   4) revalidatePath('/shopping')
//   5) 반환: 삽입된 ShoppingItem
//
// ★ DB 자동 생성 타입에 0016 객체 미반영 → untyped supabase client cast 사용.

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import type { ShoppingItem } from '@/entities/shopping-item/model/types';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { err, ok, type Result } from '@/shared/lib/result';

const InputSchema = z.object({
  name: z.string().trim().min(1, '재료 이름을 입력하세요').max(80),
  quantity: z.coerce.number().nonnegative().nullable().optional(),
  unit: z.string().trim().max(20).nullable().optional(),
});

export type AddManualShoppingInput = z.input<typeof InputSchema>;

export async function addManualShoppingItem(
  input: AddManualShoppingInput,
): Promise<Result<ShoppingItem, string>> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? '입력 검증 실패');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err('로그인이 필요합니다');

  const untyped = supabase as unknown as SupabaseClient;

  const { data, error } = await untyped
    .from('shopping_list')
    .insert({
      user_id: user.id,
      ingredient_master_id: null,
      custom_name: parsed.data.name,
      quantity: parsed.data.quantity ?? null,
      unit:
        parsed.data.unit && parsed.data.unit.length > 0
          ? parsed.data.unit
          : null,
      source: 'manual',
      recipe_id: null,
      bought: false,
      note: null,
    })
    .select(
      'id, user_id, ingredient_master_id, custom_name, quantity, unit, source, recipe_id, bought, note, created_at',
    )
    .single();

  if (error || !data) {
    console.error('[addManualShoppingItem] insert failed', error);
    return err('장바구니 항목 추가에 실패했습니다');
  }

  revalidatePath('/shopping');
  return ok(data as ShoppingItem);
}
