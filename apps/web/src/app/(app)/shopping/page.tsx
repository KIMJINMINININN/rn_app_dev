// apps/web/src/app/(app)/shopping/page.tsx
// Phase 5 §3.1 — RSC. shopping_list 조회 + ShoppingList 위젯 렌더.
//
// 데이터 흐름:
//   1) auth check (미로그인 → /login)
//   2) shopping_list fetch (본인, created_at desc)  — RLS 가 본인 격리 보장
//   3) ingredient_master.name lookup (ingredient_master_id 모은 뒤 IN 쿼리)
//   4) ShoppingList widget 렌더
//
// ★ DB 자동 생성 타입에 0016 객체 미반영 → untyped supabase client cast 사용
//   (Phase 4 0014 패턴 일관).

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ShoppingItem } from '@/entities/shopping-item/model/types';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { ShoppingList } from '@/widgets/shopping-list/shopping-list';

export const metadata: Metadata = {
  title: '장바구니',
};

type IngredientMasterNameRow = { id: string; name: string };

export default async function ShoppingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const untyped = supabase as unknown as SupabaseClient;

  // ── 1. shopping_list fetch ─────────────────────────────────────────────────
  const { data: itemsData, error: itemsErr } = await untyped
    .from('shopping_list')
    .select(
      'id, user_id, ingredient_master_id, custom_name, quantity, unit, source, recipe_id, bought, note, created_at',
    )
    .order('created_at', { ascending: false });

  if (itemsErr) {
    console.error('[shopping] shopping_list query failed', itemsErr);
  }
  const items = (itemsData ?? []) as ShoppingItem[];

  // ── 2. ingredient_master.name lookup ──────────────────────────────────────
  const masterIds = Array.from(
    new Set(
      items
        .map((it) => it.ingredient_master_id)
        .filter((v): v is string => v != null),
    ),
  );

  const masterNames = new Map<string, string>();
  if (masterIds.length > 0) {
    const { data: masterRows, error: mErr } = await untyped
      .from('ingredient_master')
      .select('id, name')
      .in('id', masterIds);
    if (mErr) {
      console.error('[shopping] ingredient_master lookup failed', mErr);
    } else {
      for (const row of (masterRows ?? []) as IngredientMasterNameRow[]) {
        masterNames.set(row.id, row.name);
      }
    }
  }

  return <ShoppingList items={items} masterNames={masterNames} />;
}
