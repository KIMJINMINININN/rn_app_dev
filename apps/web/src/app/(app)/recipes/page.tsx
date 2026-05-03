// apps/web/src/app/(app)/recipes/page.tsx
// Phase 3 §3.7 / §4.5 — RSC. recommend_recipes RPC 직접 호출.
//
// 응답 시간 측정: 100ms+ 시 unstable_cache(Next 16) 도입 검토 (현재는 직접 호출).
//
// ★ Database 자동 생성 타입(`db:types`)에 `recommend_recipes` RPC 가 아직 없어
//   호출 사이트에서 untyped supabase client 캐스트 사용 (Day 6 패턴 일관).

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { MIN_SCORE } from '@/entities/recipe/lib/scoring-constants';
import type { Recommendation } from '@/entities/recipe/model/types';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { RecipeRecommendations } from '@/widgets/recipe-recommendations/recipe-recommendations';

export const metadata: Metadata = {
  title: '레시피',
};

const RECOMMEND_LIMIT = 30;

export default async function RecipesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // RPC `recommend_recipes` 가 db:types 에 없어 untyped cast 우회.
  const untypedClient = supabase as unknown as SupabaseClient;
  const { data, error } = await untypedClient.rpc('recommend_recipes', {
    p_user: user.id,
    p_min_score: MIN_SCORE,
    p_limit: RECOMMEND_LIMIT,
  });

  if (error) {
    console.error('[recipes] recommend_recipes failed', error);
  }

  const recommendations: Recommendation[] = ((data ?? []) as Recommendation[])
    // 안전 가드: RPC가 sort 보장하더라도 score desc 재정렬.
    .slice()
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-center justify-between px-16 pt-16">
        <h1 className="text-heading-l text-gray-900">레시피 추천</h1>
      </div>
      <RecipeRecommendations recommendations={recommendations} />
    </div>
  );
}
