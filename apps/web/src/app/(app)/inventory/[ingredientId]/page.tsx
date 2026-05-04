// apps/web/src/app/(app)/inventory/[ingredientId]/page.tsx
// Phase 4 §3.5 / §4.2 — RSC. recommend_for_ingredient RPC 직접 호출 (듀얼 추천).
//
// 데이터 흐름:
//   1. params 비동기 await (Next 16 RSC params)
//   2. createSupabaseServerClient + auth check
//   3. ingredient_master 이름 조회 (헤더 표시용; 미존재 시 notFound)
//   4. recommend_for_ingredient RPC 호출 — past + new 듀얼 결과
//   5. DualList widget 렌더 (presentational)
//
// ★ Database 자동 생성 타입에 `recommend_for_ingredient` RPC 가 아직 없어
//   호출 사이트에서 untyped supabase client 캐스트 사용 (Phase 3 §3.7 패턴 동일).
// ★ ingredient 미존재 → notFound() (Next 16 import 'next/navigation').
//
// 성능 목표 (conventions §13): DualList sheet 0.5초 내 표시.
// RSC 직접 RPC 호출 (Route Handler proxy 없음) — 미달 시 unstable_cache 도입 검토.

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  type DualRecommendation,
  type NewRecipe,
  type PastRecipe,
} from '@/features/dual-recommendation/api/queries';
import { DualList } from '@/features/dual-recommendation/ui/dual-list';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';

interface PageProps {
  params: Promise<{ ingredientId: string }>;
}

const LIMIT_EACH = 5;

type IngredientMasterNameRow = {
  id: string;
  name: string;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { ingredientId } = await params;
  return { title: `재료 추천 ${ingredientId.slice(0, 8)}` };
}

export default async function IngredientRecommendationPage({
  params,
}: PageProps) {
  const { ingredientId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const untypedClient = supabase as unknown as SupabaseClient;

  // ── 1. ingredient_master 이름 조회 (헤더 + notFound 가드) ────────────────
  const { data: masterData, error: masterErr } = await supabase
    .from('ingredient_master')
    .select('id, name')
    .eq('id', ingredientId)
    .maybeSingle();

  if (masterErr) {
    console.error(
      '[inventory/ingredientId] ingredient_master query failed',
      masterErr,
    );
    notFound();
  }
  const master = masterData as IngredientMasterNameRow | null;
  if (!master) notFound();

  // ── 2. recommend_for_ingredient RPC 호출 (듀얼 추천) ─────────────────────
  const { data, error } = await untypedClient.rpc('recommend_for_ingredient', {
    p_user: user.id,
    p_master_id: ingredientId,
    p_limit_each: LIMIT_EACH,
  });

  if (error) {
    console.error(
      '[inventory/ingredientId] recommend_for_ingredient failed',
      error,
    );
  }

  // RPC returns table — Supabase wraps in array. 단일 row 추출 + null-safe.
  const row = (data?.[0] ?? {
    past_recipes: [],
    new_recipes: [],
  }) as DualRecommendation;
  const pastRecipes: PastRecipe[] = row.past_recipes ?? [];
  const newRecipes: NewRecipe[] = row.new_recipes ?? [];

  return (
    <article className="flex flex-col gap-24 px-16 py-16">
      <header className="flex flex-col gap-4">
        <h1 className="text-heading-l text-gray-900">{master.name}</h1>
        <p className="text-body-s-400 text-gray-500">
          이 재료로 만들 수 있는 요리
        </p>
      </header>
      <DualList pastRecipes={pastRecipes} newRecipes={newRecipes} />
    </article>
  );
}
