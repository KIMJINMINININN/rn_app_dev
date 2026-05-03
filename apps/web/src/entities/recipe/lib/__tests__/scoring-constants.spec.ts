// apps/web/src/entities/recipe/lib/__tests__/scoring-constants.spec.ts
// Phase 3 §6.1 — 단일 출처 상수 drift 감지 + 가중치 합 sanity check.
//
// 본 테스트는 conventions.md §19에 명시된 SSoT 값과 0011_recipes.sql 본문 inline 값이
// 표류하지 않음을 보장한다. 값 변경은 반드시 새 SQL 마이그레이션과 본 테스트의 기대값을
// 동시 갱신해야 한다 (PR 룰).
import { describe, expect, it } from 'vitest';

import {
  MIN_SCORE,
  SCORE_READY_THRESHOLD,
  WEIGHT_OPTIONAL,
  WEIGHT_REQUIRED,
  WEIGHT_URGENT,
} from '../scoring-constants';

describe('scoring-constants — SSoT (conventions.md §19)', () => {
  it('WEIGHT_REQUIRED 고정값 = 0.7', () => {
    expect(WEIGHT_REQUIRED).toBe(0.7);
  });

  it('WEIGHT_OPTIONAL 고정값 = 0.2', () => {
    expect(WEIGHT_OPTIONAL).toBe(0.2);
  });

  it('WEIGHT_URGENT 고정값 = 0.1', () => {
    expect(WEIGHT_URGENT).toBe(0.1);
  });

  it('MIN_SCORE 고정값 = 0.5 (RPC p_min_score 기본값과 동일)', () => {
    expect(MIN_SCORE).toBe(0.5);
  });

  it('SCORE_READY_THRESHOLD 고정값 = 0.95 ("지금 만들 수 있음" 분기)', () => {
    expect(SCORE_READY_THRESHOLD).toBe(0.95);
  });

  it('가중치 합 = 1.0 (부동소수 허용 오차 1e-9)', () => {
    const sum = WEIGHT_REQUIRED + WEIGHT_OPTIONAL + WEIGHT_URGENT;
    expect(Math.abs(sum - 1.0)).toBeLessThan(1e-9);
  });

  it('MIN_SCORE < SCORE_READY_THRESHOLD (임계값 순서 sanity)', () => {
    expect(MIN_SCORE).toBeLessThan(SCORE_READY_THRESHOLD);
  });
});
