'use server';

// apps/web/src/features/extract-recipe-gap/api/actions.ts
// Phase 5 §3.3 / §4.1 — features/extract-recipe-gap Server Action.
//
// 흐름 (phase-5.md §4.1):
//   1) auth check (현재 사용자)
//   2) recipe_ingredients 조회 (recipe_id 기준) + ingredient_master JOIN 으로 이름 동봉
//   3) user_ingredients 조회 (현재 사용자, consumed=false, quantity>0)
//   4) entities/shopping-item/lib/extract-recipe-gap.ts (pure) → GapItem[]
//   5) shopping_list INSERT/UPDATE:
//      - 동일 (user_id, ingredient_master_id, unit, source='recipe_gap', bought=false) row 있으면
//        quantity += gap.quantity (UPDATE 합산)
//      - note='단위 확인 필요'(단위 충돌)는 항상 별도 INSERT (UPDATE 합산 안 함)
//      - 그 외는 INSERT (source='recipe_gap', recipe_id 설정)
//   6) revalidatePath('/shopping') + 반환 { added: number } (신규+합산 처리한 항목 수)
//
// ★ DB 자동 생성 타입에 0016 객체(shopping_list / shopping_source) 가 아직 없어
//   호출 사이트에서 untyped supabase client 캐스트 사용 (Phase 4 0014 패턴 일관).

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { extractRecipeGap as calcGap } from '@/entities/shopping-item/lib/extract-recipe-gap';
import type {
  RecipeIngredientRow,
  UserIngredientRow,
} from '@/entities/shopping-item/model/types';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { err, ok, type Result } from '@/shared/lib/result';

const InputSchema = z.object({
  recipeId: z.string().uuid(),
});

type RecipeIngredientJoinedRow = {
  ingredient_master_id: string;
  quantity: number | null;
  unit: string | null;
  is_optional: boolean;
  ingredient_master: { name: string } | { name: string }[] | null;
};

type UserIngredientLookupRow = {
  ingredient_master_id: string;
  quantity: number;
  unit: string | null;
  consumed: boolean;
};

type ExistingShoppingRow = {
  id: string;
  ingredient_master_id: string | null;
  unit: string | null;
  quantity: number | null;
  note: string | null;
  bought: boolean;
  source: 'manual' | 'recipe_gap';
};

export async function extractRecipeGap(
  recipeId: string,
): Promise<Result<{ added: number }, string>> {
  const parsed = InputSchema.safeParse({ recipeId });
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? '입력 검증 실패');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err('로그인이 필요합니다');

  const untyped = supabase as unknown as SupabaseClient;

  // ── 1. recipe_ingredients + ingredient_master.name JOIN ──────────────────
  const { data: riData, error: riErr } = await untyped
    .from('recipe_ingredients')
    .select(
      'ingredient_master_id, quantity, unit, is_optional, ingredient_master:ingredient_master_id(name)',
    )
    .eq('recipe_id', parsed.data.recipeId);

  if (riErr) {
    console.error('[extractRecipeGap] recipe_ingredients query failed', riErr);
    return err('레시피 재료 조회에 실패했습니다');
  }
  const riRows = (riData ?? []) as RecipeIngredientJoinedRow[];

  if (riRows.length === 0) {
    return ok({ added: 0 });
  }

  // ingredient_master JOIN 결과는 PostgREST 가 단일/배열 어느 쪽으로 줄지 보장
  // 어렵기 때문에 둘 다 처리.
  const recipeIngredients: RecipeIngredientRow[] = riRows.map((r) => {
    const im = r.ingredient_master;
    const name = Array.isArray(im) ? (im[0]?.name ?? '') : (im?.name ?? '');
    return {
      ingredient_master_id: r.ingredient_master_id,
      ingredient_name: name,
      quantity: r.quantity,
      unit: r.unit,
      is_optional: r.is_optional,
    };
  });

  // ── 2. user_ingredients (본인, consumed=false, quantity>0) ────────────────
  const { data: uiData, error: uiErr } = await untyped
    .from('user_ingredients')
    .select('ingredient_master_id, quantity, unit, consumed')
    .eq('user_id', user.id)
    .eq('consumed', false)
    .gt('quantity', 0);

  if (uiErr) {
    console.error('[extractRecipeGap] user_ingredients query failed', uiErr);
    return err('보유 재료 조회에 실패했습니다');
  }
  const userIngredients: UserIngredientRow[] = (
    (uiData ?? []) as UserIngredientLookupRow[]
  ).map((u) => ({
    ingredient_master_id: u.ingredient_master_id,
    quantity: u.quantity,
    unit: u.unit,
    consumed: u.consumed,
  }));

  // ── 3. pure 함수 호출 (Day 2-3 산출물) ────────────────────────────────────
  const gaps = calcGap({
    recipeIngredients,
    userIngredients,
  });

  if (gaps.length === 0) {
    return ok({ added: 0 });
  }

  // ── 4. 기존 shopping_list (active recipe_gap) 조회 → 합산 후보 lookup ────
  const masterIds = Array.from(
    new Set(gaps.map((g) => g.ingredient_master_id)),
  );

  const { data: existingData, error: existingErr } = await untyped
    .from('shopping_list')
    .select('id, ingredient_master_id, unit, quantity, note, bought, source')
    .eq('user_id', user.id)
    .eq('bought', false)
    .eq('source', 'recipe_gap')
    .in('ingredient_master_id', masterIds);

  if (existingErr) {
    console.error('[extractRecipeGap] existing lookup failed', existingErr);
    return err('장바구니 조회에 실패했습니다');
  }

  const existingByKey = new Map<string, ExistingShoppingRow>();
  for (const row of (existingData ?? []) as ExistingShoppingRow[]) {
    if (!row.ingredient_master_id) continue;
    // 단위 충돌 row 는 합산 후보에서 제외 (note='단위 확인 필요' 별도 보존)
    if (row.note === '단위 확인 필요') continue;
    const key = `${row.ingredient_master_id}::${row.unit ?? ''}`;
    existingByKey.set(key, row);
  }

  // ── 5. INSERT / UPDATE 처리 ────────────────────────────────────────────────
  let added = 0;

  for (const gap of gaps) {
    const isUnitConflict = gap.note === '단위 확인 필요';
    const key = `${gap.ingredient_master_id}::${gap.unit ?? ''}`;
    const existing = isUnitConflict ? undefined : existingByKey.get(key);

    if (existing && gap.quantity != null) {
      // 합산 UPDATE
      const nextQty = (existing.quantity ?? 0) + gap.quantity;
      const { error: upErr } = await untyped
        .from('shopping_list')
        .update({ quantity: nextQty })
        .eq('id', existing.id);
      if (upErr) {
        console.error('[extractRecipeGap] update failed', upErr);
        return err('장바구니 업데이트에 실패했습니다');
      }
      added += 1;
      continue;
    }

    if (existing && gap.quantity == null) {
      // 이미 존재하고 신규 추가 수량이 null (= presence-only) → 변경 없이 카운트만
      added += 1;
      continue;
    }

    // INSERT
    const { error: insErr } = await untyped.from('shopping_list').insert({
      user_id: user.id,
      ingredient_master_id: gap.ingredient_master_id,
      custom_name: null,
      quantity: gap.quantity,
      unit: gap.unit,
      source: 'recipe_gap',
      recipe_id: parsed.data.recipeId,
      bought: false,
      note: gap.note ?? null,
    });
    if (insErr) {
      console.error('[extractRecipeGap] insert failed', insErr);
      return err('장바구니 추가에 실패했습니다');
    }
    added += 1;
  }

  revalidatePath('/shopping');
  return ok({ added });
}
