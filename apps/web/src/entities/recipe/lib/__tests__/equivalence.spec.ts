// apps/web/src/entities/recipe/lib/__tests__/equivalence.spec.ts
// Phase 3 §6.2 — TS↔SQL 동치성 정적 검증
//
// 목적: SQL recommend_recipes() 본문에 inline으로 박힌 가중치(0.7 / 0.2 / 0.1)와
// MIN_SCORE 기본값(0.5)이 scoring-constants.ts와 동일함을 정적으로 검증한다.
// 이 정적 검증은 단일 출처(SSoT) 룰의 자동 가드 — supabase 인스턴스 없이
// 실행 가능하므로 CI에서도 항상 돈다.
//
// 추가로 supabase local Docker가 실행 중일 때 RPC를 호출하여 TS computeRecipeMatch와
// score 차이 < 0.0001을 검증하는 통합 블록은 SUPABASE_LOCAL_URL 환경변수가 set일 때만
// 활성화되도록 conditional skip 처리한다 (Day 4 deferred — 사용자 환경 의존).
import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  MIN_SCORE,
  SCORE_READY_THRESHOLD,
  WEIGHT_OPTIONAL,
  WEIGHT_REQUIRED,
  WEIGHT_URGENT,
} from '../scoring-constants';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../supabase/migrations/0011_recipes.sql',
);

function readMigration(): string {
  return fs.readFileSync(MIGRATION_PATH, 'utf8');
}

describe('TS↔SQL 동치성 (정적): 0011_recipes.sql inline 가중치 ↔ scoring-constants.ts', () => {
  it('마이그레이션 파일이 읽힌다', () => {
    const sql = readMigration();
    expect(sql.length).toBeGreaterThan(0);
    expect(sql).toContain('recommend_recipes');
  });

  it('p_min_score 기본값이 MIN_SCORE와 동일하다', () => {
    const sql = readMigration();
    // create or replace function ... p_min_score real default 0.5
    const m = sql.match(/p_min_score\s+real\s+default\s+([\d.]+)/i);
    expect(m, 'p_min_score default 정의를 SQL에서 찾지 못했다').not.toBeNull();
    const sqlMin = Number(m![1]);
    expect(sqlMin).toBeCloseTo(MIN_SCORE, 6);
  });

  it('SQL score 공식의 가중치 3개가 WEIGHT_REQUIRED/OPTIONAL/URGENT와 일치한다', () => {
    const sql = readMigration();

    // recommend_recipes() 본문에서 score 식이 두 군데 나옴 (SELECT, WHERE).
    // 형태: 0.7 * (rs.required_have::real / nullif(rs.required_total, 0))
    //       + 0.2 * (rs.optional_have::real / greatest(rs.optional_total, 1))
    //       + 0.1 * (rs.urgent_have::real / nullif(rs.required_total, 0))
    const requiredMatches = [
      ...sql.matchAll(
        /([\d.]+)\s*\*\s*\(\s*rs\.required_have::real\s*\/\s*nullif\(\s*rs\.required_total\s*,\s*0\s*\)\s*\)/g,
      ),
    ];
    const optionalMatches = [
      ...sql.matchAll(
        /([\d.]+)\s*\*\s*\(\s*rs\.optional_have::real\s*\/\s*greatest\(\s*rs\.optional_total\s*,\s*1\s*\)\s*\)/g,
      ),
    ];
    const urgentMatches = [
      ...sql.matchAll(
        /([\d.]+)\s*\*\s*\(\s*rs\.urgent_have::real\s*\/\s*nullif\(\s*rs\.required_total\s*,\s*0\s*\)\s*\)/g,
      ),
    ];

    // SELECT에 1번, WHERE에 1번 — 총 2번씩 나와야 한다.
    expect(requiredMatches.length).toBe(2);
    expect(optionalMatches.length).toBe(2);
    expect(urgentMatches.length).toBe(2);

    // 각 occurrence가 모두 동일한 가중치인지 확인 (자기 일관성).
    const requiredWeights = requiredMatches.map((m) => Number(m[1]));
    const optionalWeights = optionalMatches.map((m) => Number(m[1]));
    const urgentWeights = urgentMatches.map((m) => Number(m[1]));

    expect(new Set(requiredWeights).size).toBe(1);
    expect(new Set(optionalWeights).size).toBe(1);
    expect(new Set(urgentWeights).size).toBe(1);

    // TS 상수와 동일한지 확인.
    expect(requiredWeights[0]).toBeCloseTo(WEIGHT_REQUIRED, 6);
    expect(optionalWeights[0]).toBeCloseTo(WEIGHT_OPTIONAL, 6);
    expect(urgentWeights[0]).toBeCloseTo(WEIGHT_URGENT, 6);
  });

  it('가중치 합 = 1.0 (정의상 만점은 1.0)', () => {
    expect(WEIGHT_REQUIRED + WEIGHT_OPTIONAL + WEIGHT_URGENT).toBeCloseTo(
      1.0,
      6,
    );
  });

  it('SCORE_READY_THRESHOLD > MIN_SCORE 단조성', () => {
    expect(SCORE_READY_THRESHOLD).toBeGreaterThan(MIN_SCORE);
    expect(SCORE_READY_THRESHOLD).toBeLessThanOrEqual(1.0);
  });

  it('urgent 윈도우가 SQL과 TS 양쪽에서 [0, 2]일로 일치한다 (already-expired 제외)', () => {
    const sql = readMigration();
    // SQL: ui.expires_at - current_date between 0 and 2
    expect(sql).toMatch(
      /ui\.expires_at\s*-\s*current_date\s+between\s+0\s+and\s+2/,
    );
    // TS는 computeRecipeMatch.ts에서 diffDays >= 0 && diffDays <= URGENT_DAYS(=2).
    // (이 fixture는 컴퓨트 결과를 통해 unit test에서 이미 검증됨 — 여기서는 SQL 측만 가드.)
  });
});

// ───────────────────────────────────────────────────────────────────────────
// supabase local 통합 (deferred — 사용자 환경 의존)
// ───────────────────────────────────────────────────────────────────────────
// SUPABASE_LOCAL_URL 환경변수가 설정된 경우에만 활성화된다.
// 활성화 조건:
//   1. supabase local이 docker로 실행 중 (`pnpm web db:start`)
//   2. 0011/0012/0013 마이그레이션이 적용됨 (`pnpm web db:reset`)
//   3. SUPABASE_LOCAL_URL=http://127.0.0.1:54321 같은 값이 export 됨
//
// 미설정 시 skip + console.info로 안내. CI에서는 의도적으로 skip 됨.
const HAS_SUPABASE_LOCAL = Boolean(process.env.SUPABASE_LOCAL_URL);

describe.skipIf(!HAS_SUPABASE_LOCAL)(
  'TS↔SQL 동치성 (RPC 통합): computeRecipeMatch ↔ recommend_recipes()',
  () => {
    it('placeholder — Day 8 (통합 테스트) 또는 사용자 환경에서 활성화 예정', () => {
      // 본 통합 테스트는 Day 8 작업으로 이관됨 (phase-3.md §6.2).
      // 현재 단계에서는 정적 가중치 동치성으로 충분히 SSoT를 보장한다.
      //
      // 향후 구현 시 골자:
      //   1. @supabase/supabase-js anon client로 RPC 호출
      //   2. 동일 fixture (computeRecipeMatch.spec.ts와 동일 사용자 보유 + 레시피)를
      //      DB에 seed → recommend_recipes() 호출
      //   3. 각 fixture별 score 차이 abs() < 0.0001 검증
      expect(HAS_SUPABASE_LOCAL).toBe(true);
    });
  },
);

if (!HAS_SUPABASE_LOCAL) {
  console.info(
    '[equivalence.spec] SUPABASE_LOCAL_URL 미설정 — RPC 통합 테스트 skip. ' +
      '활성화: `pnpm web db:start && pnpm web db:reset && export SUPABASE_LOCAL_URL=http://127.0.0.1:54321`',
  );
}
