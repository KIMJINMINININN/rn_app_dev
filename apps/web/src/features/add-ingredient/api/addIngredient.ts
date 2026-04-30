'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { err, ok, type Result } from '@/shared/lib/result';
import type { UserIngredient } from '@/entities/ingredient/model/types';

const InputSchema = z.object({
  ingredient_master_id: z.string().uuid(),
  storage_location_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1).default('개'),
  purchased_at: z.string().date().nullable().optional(),
  expires_at: z.string().date().nullable().optional(),
  memo: z.string().max(500).nullable().optional(),
});

export async function addIngredient(
  input: z.input<typeof InputSchema>,
): Promise<Result<UserIngredient, string>> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? '입력 검증 실패');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err('로그인이 필요합니다');

  const { data, error } = await supabase
    .from('user_ingredients')
    .insert({
      user_id: user.id,
      ingredient_master_id: parsed.data.ingredient_master_id,
      storage_location_id: parsed.data.storage_location_id,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      purchased_at: parsed.data.purchased_at ?? null,
      expires_at: parsed.data.expires_at ?? null,
      memo: parsed.data.memo ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('addIngredient failed', error);
    return err('재료 추가에 실패했습니다');
  }

  revalidatePath('/inventory');
  return ok(data);
}
