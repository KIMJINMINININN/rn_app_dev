// apps/web/src/entities/cooking-history/model/types.ts
// Phase 4 §3.1 — entities/cooking-history 슬라이스 도메인 모델
//
// 본 파일은 0014_cooking_history.sql (`cooking_history` +
// `cooking_history_consumed_ingredients`)의 row 타입을 거울처럼 반영한다.
// supabase 자동 생성 타입(`db:types`)이 0014 테이블을 아직 포함하지 않아
// 작업용 단일 출처. 호출 사이트(RSC page)는 untyped supabase client cast 후
// 본 타입으로 재캐스트하여 사용한다.

export interface CookingHistoryRow {
  id: string;
  user_id: string;
  recipe_id: string | null;
  custom_recipe_name: string | null;
  cooked_at: string;
  rating: number | null;
  memo: string | null;
}

export interface CookingHistoryConsumedRow {
  history_id: string;
  ingredient_master_id: string;
  quantity: number | null;
  unit: string | null;
}

/**
 * 1개 요리 세션 — `cooking_history` row + 연결된 consumed ingredient rows + 옵션
 * recipe_master.name (recipe_id 가 not null 일 때만 RSC 페이지에서 join 결과 주입).
 *
 * recipe_id 가 null 인 경우 custom_recipe_name 으로 표시한다 (UI fallback).
 */
export interface CookingSession extends CookingHistoryRow {
  consumed: CookingHistoryConsumedRow[];
  recipe_name?: string | null;
}
