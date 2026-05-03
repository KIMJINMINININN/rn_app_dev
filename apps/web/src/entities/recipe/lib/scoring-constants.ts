// apps/web/src/entities/recipe/lib/scoring-constants.ts
// ★ 단일 출처 상수 (conventions.md §11 / §19)
//
// 이 파일은 레시피 매칭 점수 공식의 SSoT(Single Source of Truth)이다.
// 동일 값은 SQL 마이그레이션 0011_recipes.sql의 recommend_recipes() 본문에 inline으로
// 박혀 있다 (0.7 / 0.2 / 0.1 / 0.5). 변경 시 두 파일 동시 변경 + 새 마이그레이션 필요
// (마이그레이션은 immutable). PR 리뷰 룰로 강제한다.
//
// 매칭 공식:
//   score = WEIGHT_REQUIRED * (필수보유/필수전체)
//         + WEIGHT_OPTIONAL * (선택보유/max(선택전체, 1))
//         + WEIGHT_URGENT   * (임박보유/필수전체)
//
// 임계값:
//   score ≥ SCORE_READY_THRESHOLD → "지금 만들 수 있음"
//   MIN_SCORE ≤ score < SCORE_READY_THRESHOLD → "재료 1-2개 부족"
//   score < MIN_SCORE → 추천 제외 (RPC 또는 호출자 필터링)
export const WEIGHT_REQUIRED = 0.7;
export const WEIGHT_OPTIONAL = 0.2;
export const WEIGHT_URGENT = 0.1;
export const SCORE_READY_THRESHOLD = 0.95;
export const MIN_SCORE = 0.5;
