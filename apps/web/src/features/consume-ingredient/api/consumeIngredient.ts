'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { err, ok, type Result } from '@/shared/lib/result';

const InputSchema = z.object({
  id: z.string().uuid(),
  newQuantity: z.coerce.number().min(0),
});

export async function consumeIngredient(
  input: z.input<typeof InputSchema>,
): Promise<Result<void, string>> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? '입력 검증 실패');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err('로그인이 필요합니다');

  const { error } = await supabase
    .from('user_ingredients')
    .update({ quantity: parsed.data.newQuantity })
    .eq('id', parsed.data.id);

  if (error) {
    console.error('consumeIngredient failed', error);
    return err('소진 처리에 실패했습니다');
  }

  revalidatePath('/inventory');
  return ok(undefined);
}
