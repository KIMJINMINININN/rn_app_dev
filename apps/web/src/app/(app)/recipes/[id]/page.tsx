// apps/web/src/app/(app)/recipes/[id]/page.tsx
// Phase 3 §3.7 — RSC. recipe 상세 + computeRecipeMatch (TS mirror) + YouTube 캐시 lookup.
//
// 데이터 흐름:
//   1. params 비동기 await (Next 16 RSC params)
//   2. createSupabaseServerClient + auth check
//   3. recipe_master + recipe_ingredients fetch (id로 SELECT)
//   4. user_ingredients fetch (RLS로 본인 것만)
//   5. computeRecipeMatch(...) → Recommendation 구성 (Day 3 TS mirror)
//   6. ingredient_master 이름 lookup Map (모든 등장 id 모아서 한 번에 SELECT)
//   7. YouTube 캐시 lookup (서버사이드 — Route Handler 미왕복; cache fresh 시만 사용,
//      stale/miss 는 graceful 무시: client UX는 추후 client fetch로 보강 가능)
//   8. RecipeDetail widget 렌더
//
// ★ Database 자동 생성 타입에 recipe_master / recipe_ingredients / youtube_cache 가
//   아직 없어 호출 사이트에서 untyped supabase client 캐스트 사용 (Day 6 패턴 일관).
// ★ recipe 미존재 → notFound() (Next 16 import 'next/navigation').

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { computeRecipeMatch } from '@/entities/recipe/lib/computeRecipeMatch';
import type {
  Recommendation,
  RecipeIngredientRow,
  RecipeMaster,
} from '@/entities/recipe/model/types';
import {
  isCacheFresh,
  lookupCache,
} from '@/features/youtube-embed/api/route-handler';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { RecipeDetail } from '@/widgets/recipe-detail/recipe-detail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `레시피 ${id.slice(0, 8)}` };
}

type UserIngredientRow = {
  ingredient_master_id: string;
  expires_at: string | null;
  consumed: boolean;
  quantity: number;
};

type IngredientMasterNameRow = {
  id: string;
  name: string;
};

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const untypedClient = supabase as unknown as SupabaseClient;

  // ── 1. recipe_master + recipe_ingredients 병렬 fetch ─────────────────────
  const [recipeRes, ingredientsRes] = await Promise.all([
    untypedClient
      .from('recipe_master')
      .select(
        'id, name, description, cook_minutes, difficulty, servings, instructions_md, created_at',
      )
      .eq('id', id)
      .maybeSingle(),
    untypedClient
      .from('recipe_ingredients')
      .select('recipe_id, ingredient_master_id, quantity, unit, is_optional')
      .eq('recipe_id', id),
  ]);

  if (recipeRes.error) {
    console.error('[recipe-detail] recipe_master query failed', recipeRes.error);
    notFound();
  }
  const recipe = recipeRes.data as RecipeMaster | null;
  if (!recipe) notFound();

  if (ingredientsRes.error) {
    console.error(
      '[recipe-detail] recipe_ingredients query failed',
      ingredientsRes.error,
    );
  }
  const recipeIngredients = (ingredientsRes.data ?? []) as RecipeIngredientRow[];

  // ── 2. user_ingredients fetch (RLS로 본인 것만) ───────────────────────────
  const { data: userIngredientsData, error: uiError } = await untypedClient
    .from('user_ingredients')
    .select('ingredient_master_id, expires_at, consumed, quantity')
    .eq('user_id', user.id);

  if (uiError) {
    console.error('[recipe-detail] user_ingredients query failed', uiError);
  }
  const userIngredients = (userIngredientsData ?? []) as UserIngredientRow[];

  // ── 3. computeRecipeMatch (TS mirror) → Recommendation 구성 ──────────────
  const match = computeRecipeMatch(
    recipeIngredients.map((ri) => ({
      ingredient_master_id: ri.ingredient_master_id,
      is_optional: ri.is_optional,
      quantity: ri.quantity,
      unit: ri.unit,
    })),
    userIngredients,
  );

  const recommendation: Recommendation = {
    recipe_id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    cook_minutes: recipe.cook_minutes,
    difficulty: recipe.difficulty,
    servings: recipe.servings,
    required_total: match.required_total,
    required_have: match.required_have,
    optional_total: match.optional_total,
    optional_have: match.optional_have,
    urgent_have: match.urgent_have,
    score: match.score,
    missing_required: match.missing_required.map((m) => ({
      ingredient_master_id: m.ingredient_master_id,
      quantity: m.quantity ?? null,
      unit: m.unit ?? null,
    })),
    missing_optional: match.missing_optional.map((m) => ({
      ingredient_master_id: m.ingredient_master_id,
      quantity: m.quantity ?? null,
      unit: m.unit ?? null,
    })),
  };

  // ── 4. ingredient_master 이름 lookup Map ──────────────────────────────────
  const ingredientIds = Array.from(
    new Set(recipeIngredients.map((ri) => ri.ingredient_master_id)),
  );
  let ingredientNames: Map<string, string> | undefined;
  if (ingredientIds.length > 0) {
    const { data: masterRows, error: mErr } = await untypedClient
      .from('ingredient_master')
      .select('id, name')
      .in('id', ingredientIds);
    if (mErr) {
      console.error('[recipe-detail] ingredient_master lookup failed', mErr);
    } else {
      const map = new Map<string, string>();
      for (const row of (masterRows ?? []) as IngredientMasterNameRow[]) {
        map.set(row.id, row.name);
      }
      ingredientNames = map;
    }
  }

  // ── 5. YouTube 캐시 lookup (서버사이드, miss/stale 시 graceful 무시) ─────
  let youtubeVideoId: string | undefined;
  try {
    const cached = await lookupCache(untypedClient, `recipe:${recipe.name}`);
    if (cached && isCacheFresh(cached.fetched_at) && cached.payload.length > 0) {
      youtubeVideoId = cached.payload[0]?.videoId;
    }
  } catch (e) {
    console.error('[recipe-detail] youtube cache lookup failed', e);
  }

  return (
    <RecipeDetail
      recipe={recipe}
      recipeIngredients={recipeIngredients}
      recommendation={recommendation}
      ingredientNames={ingredientNames}
      youtubeVideoId={youtubeVideoId}
    />
  );
}
