import { describe, expect, it } from 'vitest';

import { computeDDay } from './computeDDay';

describe('computeDDay', () => {
  it.each([
    ['null = 무기한', null, '2026-04-30T12:00:00+09:00', null, 'fine'],
    ['만료 어제', '2026-04-29', '2026-04-30T12:00:00+09:00', -1, 'expired'],
    ['만료 3일 전', '2026-04-27', '2026-04-30T12:00:00+09:00', -3, 'expired'],
    ['urgent 오늘', '2026-04-30', '2026-04-30T12:00:00+09:00', 0, 'urgent'],
    ['urgent D-2', '2026-05-02', '2026-04-30T12:00:00+09:00', 2, 'urgent'],
    ['soon D-3', '2026-05-03', '2026-04-30T12:00:00+09:00', 3, 'soon'],
    ['soon D-7', '2026-05-07', '2026-04-30T12:00:00+09:00', 7, 'soon'],
    ['fine D-8', '2026-05-08', '2026-04-30T12:00:00+09:00', 8, 'fine'],
  ] as const)('%s', (_label, expiresAt, now, expectedDays, expectedBucket) => {
    const result = computeDDay(expiresAt, now);
    expect(result.days).toBe(expectedDays);
    expect(result.bucket).toBe(expectedBucket);
  });
});
