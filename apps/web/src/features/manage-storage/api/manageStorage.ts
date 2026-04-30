'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type {
  StorageKind,
  StorageLocation,
} from '@/entities/ingredient/model/types';
import { createSupabaseAdminClient } from '@/shared/api/supabase/admin';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { err, ok, type Result } from '@/shared/lib/result';

const AddSchema = z.object({
  name: z.string().min(1).max(50),
  kind: z.enum(['fridge', 'freezer', 'room_temp', 'kimchi_fridge', 'custom']),
});

const RenameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
});

const DeleteSchema = z.object({
  id: z.string().uuid(),
});

async function authedClient() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function addStorage(
  input: z.input<typeof AddSchema>,
): Promise<Result<StorageLocation, string>> {
  const parsed = AddSchema.safeParse(input);
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? '입력 검증 실패');

  const { user } = await authedClient();
  if (!user) return err('로그인이 필요합니다');

  // 0003 RLS INSERT 정책 미존재 (handle_new_user definer 전용) → admin client 우회.
  // 사용자 인증 검증 후 본인 user_id 명시 INSERT.
  const admin = createSupabaseAdminClient();

  const { data: maxRow } = await admin
    .from('storage_locations')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await admin
    .from('storage_locations')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      kind: parsed.data.kind as StorageKind,
      sort_order: nextSort,
    })
    .select()
    .single();

  if (error) {
    console.error('addStorage failed', error);
    return err('보관 장소 추가에 실패했습니다');
  }

  revalidatePath('/inventory');
  return ok(data);
}

export async function renameStorage(
  input: z.input<typeof RenameSchema>,
): Promise<Result<StorageLocation, string>> {
  const parsed = RenameSchema.safeParse(input);
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? '입력 검증 실패');

  const { supabase, user } = await authedClient();
  if (!user) return err('로그인이 필요합니다');

  const { data, error } = await supabase
    .from('storage_locations')
    .update({ name: parsed.data.name })
    .eq('id', parsed.data.id)
    .select()
    .single();

  if (error) {
    console.error('renameStorage failed', error);
    return err('이름 변경에 실패했습니다');
  }

  revalidatePath('/inventory');
  return ok(data);
}

export async function deleteStorage(
  input: z.input<typeof DeleteSchema>,
): Promise<Result<void, string>> {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? '입력 검증 실패');

  const { supabase, user } = await authedClient();
  if (!user) return err('로그인이 필요합니다');

  const { count, error: countErr } = await supabase
    .from('user_ingredients')
    .select('*', { count: 'exact', head: true })
    .eq('storage_location_id', parsed.data.id)
    .eq('consumed', false);

  if (countErr) {
    console.error('deleteStorage count failed', countErr);
    return err('식재료 확인 중 오류가 발생했습니다');
  }
  if ((count ?? 0) > 0) {
    return err('이 보관 장소에 식재료가 있어 삭제할 수 없습니다');
  }

  const { error } = await supabase
    .from('storage_locations')
    .delete()
    .eq('id', parsed.data.id);

  if (error) {
    console.error('deleteStorage failed', error);
    return err('삭제에 실패했습니다');
  }

  revalidatePath('/inventory');
  return ok(undefined);
}
