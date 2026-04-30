import { describe, expect, it } from 'vitest';

import { computeDDay } from './computeDDay';
import { URGENT_THRESHOLD_DAYS } from './dday-thresholds';

// 0010 SQL 분류식과 TS computeDDay bucket 일치 검증.
// SQL: expiring_soon = expires_at - current_date BETWEEN 0 AND 2 (URGENT_THRESHOLD_DAYS)
// SQL: expired      = expires_at < current_date
// TS:  urgent = days <= 2 && days >= 0
// TS:  expired = days < 0
describe('computeDDay ↔ 0010 get_inventory_summary 분류 동치성', () => {
  const today = '2026-04-30T12:00:00+09:00';

  it.each([
    ['2026-04-30', true, false],
    ['2026-05-01', true, false],
    ['2026-05-02', true, false],
    ['2026-05-03', false, false],
    ['2026-04-29', false, true],
    ['2026-04-27', false, true],
  ] as const)(
    'expiresAt=%s SQL expiring_soon=%s expired=%s',
    (expiresAt, sqlExpiring, sqlExpired) => {
      const { days, bucket } = computeDDay(expiresAt, today);
      const tsExpiring =
        days !== null && days >= 0 && days <= URGENT_THRESHOLD_DAYS;
      const tsExpired = bucket === 'expired';
      expect(tsExpiring).toBe(sqlExpiring);
      expect(tsExpired).toBe(sqlExpired);
    },
  );
});
