'use client';

// apps/web/src/features/dual-recommendation/api/queries.ts
// Phase 4 §3.3 / §4.3 — features/dual-recommendation
//
// 클라이언트 측 TanStack Query 훅. RSC 직접 RPC 호출은 page에서 (Day 5).
// 본 hook은 client 인터랙션 후 재요청(invalidate) 또는 sheet에서 호출 용도.
//
// queryKey 규약 (conventions.md §17 / phase-4 §4.3):
//   ['recipes', 'for-ingredient', masterId]
//
// staleTime: 5분 — RPC 비용이 크므로 보수적 (conventions.md §17.2).
//
// ★ Database 자동 생성 타입에 `recommend_for_ingredient` RPC가 아직 없어
//   call site에서 untyped client cast를 사용한다. db:types 재생성 시 제거 가능.
//   (Phase 3 list-recommendations/api/queries.ts 패턴 동일.)

import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';

const STALE_TIME_MS = 5 * 60 * 1000;
const LIMIT_EACH = 5;

export interface PastRecipe {
  recipe_id: string;
  name: string;
  last_cooked_at: string;
  cooked_count: number;
}

export interface NewRecipe {
  recipe_id: string;
  name: string;
  score: number;
  cook_minutes: number | null;
}

export interface DualRecommendation {
  past_recipes: PastRecipe[];
  new_recipes: NewRecipe[];
}

export function useDualRecommendation(
  masterId: string | null | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['recipes', 'for-ingredient', masterId],
    enabled: !!userId && !!masterId,
    staleTime: STALE_TIME_MS,
    queryFn: async (): Promise<DualRecommendation> => {
      const supabase = createSupabaseBrowserClient() as unknown as SupabaseClient;
      const { data, error } = await supabase.rpc('recommend_for_ingredient', {
        p_user: userId!,
        p_master_id: masterId!,
        p_limit_each: LIMIT_EACH,
      });
      if (error) throw error;
      // RPC returns table — Supabase wraps in array. 단일 row 추출.
      const row = (data?.[0] ?? {
        past_recipes: [],
        new_recipes: [],
      }) as DualRecommendation;
      return {
        past_recipes: row.past_recipes ?? [],
        new_recipes: row.new_recipes ?? [],
      };
    },
  });
}
