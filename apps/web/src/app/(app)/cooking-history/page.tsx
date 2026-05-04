// apps/web/src/app/(app)/cooking-history/page.tsx
// Phase 4 §3.5 — RSC. cooking_history 리스트.
//
// 데이터 흐름:
//   1. createSupabaseServerClient + auth check (미로그인 → /login)
//   2. cooking_history fetch (cooked_at desc, RLS 본인 격리, LIMIT 50)
//   3. cooking_history_consumed_ingredients fetch (history_id IN ...)
//   4. recipe_master.name fetch (recipe_id IS NOT NULL 인 것만)
//   5. ingredient_master.name fetch (consumed.ingredient_master_id IN ...)
//   6. CookingSession[] 조립 후 widget 에 전달
//
// ★ Database 자동 생성 타입에 0014 객체가 없어 untyped supabase client cast 사용
//   (Phase 4 Day 4 log-cooking-session.ts 와 동일 패턴).
//
// 효율성 결정: 4 fetch 를 sequential 로 둔다 (cooking_history 결과에 의존하는
// 후속 IN 쿼리). 통합 RPC 는 phase-4.md 미명시 — 본 task 추가 X.
// LIMIT 50 + 인덱스 (user_id, cooked_at desc — 0014) + IN clause 한 번씩 → 50건
// 기준 합산 4 round-trip 의 비용은 허용 가능. Phase 5+ 로드 추세 보면서 통합 RPC 검토.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CookingHistoryConsumedRow,
  CookingHistoryRow,
  CookingSession,
} from '@/entities/cooking-history/model/types';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { CookingHistoryList } from '@/widgets/cooking-history-list/cooking-history-list';

export const metadata: Metadata = {
  title: '요리 기록',
};

const HISTORY_LIMIT = 50;

type RecipeNameRow = {
  id: string;
  name: string;
};

type IngredientMasterNameRow = {
  id: string;
  name: string;
};

export default async function CookingHistoryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const untypedClient = supabase as unknown as SupabaseClient;

  // ── 1. cooking_history fetch (cooked_at desc, RLS 본인 격리) ────────────
  const { data: historyData, error: historyErr } = await untypedClient
    .from('cooking_history')
    .select('id, user_id, recipe_id, custom_recipe_name, cooked_at, rating, memo')
    .order('cooked_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  if (historyErr) {
    console.error('[cooking-history] cooking_history query failed', historyErr);
  }
  const historyRows = (historyData ?? []) as CookingHistoryRow[];

  // 빈 결과 단축 — widget 빈 상태 위임.
  if (historyRows.length === 0) {
    return (
      <div className="flex flex-col gap-12">
        <PageHeader total={0} />
        <CookingHistoryList sessions={[]} />
      </div>
    );
  }

  const historyIds = historyRows.map((r) => r.id);
  const recipeIds = Array.from(
    new Set(
      historyRows
        .map((r) => r.recipe_id)
        .filter((v): v is string => v != null),
    ),
  );

  // ── 2. consumed ingredients fetch (history_id IN ...) ─────────────────────
  const consumedRowsByHistory = new Map<string, CookingHistoryConsumedRow[]>();
  {
    const { data: consumedData, error: consumedErr } = await untypedClient
      .from('cooking_history_consumed_ingredients')
      .select('history_id, ingredient_master_id, quantity, unit')
      .in('history_id', historyIds);

    if (consumedErr) {
      console.error(
        '[cooking-history] consumed_ingredients query failed',
        consumedErr,
      );
    }
    const consumedRows = (consumedData ?? []) as CookingHistoryConsumedRow[];
    for (const row of consumedRows) {
      const list = consumedRowsByHistory.get(row.history_id) ?? [];
      list.push(row);
      consumedRowsByHistory.set(row.history_id, list);
    }
  }

  // ── 3. recipe_master.name fetch (recipe_id 가 not null 인 row 전용) ──────
  const recipeNameById = new Map<string, string>();
  if (recipeIds.length > 0) {
    const { data: recipeData, error: recipeErr } = await untypedClient
      .from('recipe_master')
      .select('id, name')
      .in('id', recipeIds);

    if (recipeErr) {
      console.error('[cooking-history] recipe_master query failed', recipeErr);
    }
    for (const row of (recipeData ?? []) as RecipeNameRow[]) {
      recipeNameById.set(row.id, row.name);
    }
  }

  // ── 4. ingredient_master.name lookup Map ──────────────────────────────────
  const masterIds = Array.from(
    new Set(
      Array.from(consumedRowsByHistory.values())
        .flat()
        .map((c) => c.ingredient_master_id),
    ),
  );
  let ingredientNames: Map<string, string> | undefined;
  if (masterIds.length > 0) {
    const { data: masterData, error: masterErr } = await untypedClient
      .from('ingredient_master')
      .select('id, name')
      .in('id', masterIds);

    if (masterErr) {
      console.error(
        '[cooking-history] ingredient_master lookup failed',
        masterErr,
      );
    } else {
      const m = new Map<string, string>();
      for (const row of (masterData ?? []) as IngredientMasterNameRow[]) {
        m.set(row.id, row.name);
      }
      ingredientNames = m;
    }
  }

  // ── 5. CookingSession[] 조립 ──────────────────────────────────────────────
  const sessions: CookingSession[] = historyRows.map((h) => ({
    ...h,
    consumed: consumedRowsByHistory.get(h.id) ?? [],
    recipe_name: h.recipe_id ? (recipeNameById.get(h.recipe_id) ?? null) : null,
  }));

  return (
    <div className="flex flex-col gap-12">
      <PageHeader total={sessions.length} />
      <CookingHistoryList
        sessions={sessions}
        ingredientNames={ingredientNames}
      />
    </div>
  );
}

function PageHeader({ total }: { total: number }) {
  return (
    <div className="flex items-baseline justify-between px-16 pt-16">
      <h1 className="text-heading-l text-gray-900">요리 기록</h1>
      <span className="text-body-xs-400 text-gray-500">총 {total}건</span>
    </div>
  );
}
