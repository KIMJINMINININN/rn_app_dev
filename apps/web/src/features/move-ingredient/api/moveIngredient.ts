'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { UserIngredient } from '@/entities/ingredient/model/types';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { err, ok, type Result } from '@/shared/lib/result';

const InputSchema = z.object({
  id: z.string().uuid(),
  newStorageId: z.string().uuid(),
});

export async function moveIngredient(
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

  const { data: storage, error: storageErr } = await supabase
    .from('storage_locations')
    .select('id')
    .eq('id', parsed.data.newStorageId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (storageErr || !storage) {
    return err('보관 장소를 찾을 수 없습니다');
  }

  const { data, error } = await supabase
    .from('user_ingredients')
    .update({ storage_location_id: parsed.data.newStorageId })
    .eq('id', parsed.data.id)
    .select()
    .single();

  if (error) {
    console.error('moveIngredient failed', error);
    return err('보관 장소 이동에 실패했습니다');
  }

  revalidatePath('/inventory');
  return ok(data);
}
