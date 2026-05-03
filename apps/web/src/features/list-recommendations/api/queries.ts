'use client';

// apps/web/src/features/list-recommendations/api/queries.ts
// Phase 3 §3.2 — features/list-recommendations
//
// 클라이언트 측 TanStack Query 훅. RSC 직접 RPC 호출은 page에서 (Day 7).
// 본 hook은 client refresh / 인터랙션 후 재요청 용도.
//
// queryKey 규약 (conventions.md §17 / phase-3 §4.4):
//   ['recipes', 'recommendations', userId]
//
// staleTime: 5분 — RPC 비용이 크므로 보수적 (conventions.md §17.2).
//
// ★ Database 자동 생성 타입에 `recommend_recipes` RPC가 아직 없어
//   call site에서 untyped client cast를 사용한다. db:types 재생성 시 제거 가능.

import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Recommendation } from '@/entities/recipe/model/types';
import { MIN_SCORE } from '@/entities/recipe/lib/scoring-constants';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';

const RECOMMEND_LIMIT = 30;
const STALE_TIME_MS = 5 * 60 * 1000;

export function useRecipeRecommendations(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['recipes', 'recommendations', userId],
    enabled: !!userId,
    staleTime: STALE_TIME_MS,
    queryFn: async (): Promise<Recommendation[]> => {
      const supabase = createSupabaseBrowserClient() as unknown as SupabaseClient;
      const { data, error } = await supabase.rpc('recommend_recipes', {
        p_user: userId!,
        p_min_score: MIN_SCORE,
        p_limit: RECOMMEND_LIMIT,
      });
      if (error) throw error;
      return (data ?? []) as Recommendation[];
    },
  });
}
