import { describe, expect, it } from 'vitest';

import { applySort, sortByExpiring, sortByName, sortByRecent } from './sort';

const fixture = [
  {
    id: 'a',
    expires_at: '2026-05-05',
    created_at: '2026-04-25T00:00:00Z',
    master: { name: '양파' },
  },
  {
    id: 'b',
    expires_at: '2026-05-01',
    created_at: '2026-04-29T00:00:00Z',
    master: { name: '대파' },
  },
  {
    id: 'c',
    expires_at: null,
    created_at: '2026-04-28T00:00:00Z',
    master: { name: '쌀' },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[];

describe('sort.ts', () => {
  it('sortByExpiring: 빠른 만료 우선, null 마지막', () => {
    const result = sortByExpiring(fixture);
    expect(result.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('sortByRecent: 최근 created_at 우선', () => {
    const result = sortByRecent(fixture);
    expect(result.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('sortByName: 한국어 가나다순', () => {
    const result = sortByName(fixture);
    expect(result.map((r) => r.master.name)).toEqual(['대파', '쌀', '양파']);
  });

  it('applySort 디스패치', () => {
    expect(applySort(fixture, 'expiring')[0].id).toBe('b');
    expect(applySort(fixture, 'recent')[0].id).toBe('b');
    expect(applySort(fixture, 'name')[0].master.name).toBe('대파');
  });
});
