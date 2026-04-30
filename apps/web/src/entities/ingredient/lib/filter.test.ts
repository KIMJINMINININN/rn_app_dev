import { describe, expect, it } from 'vitest';

import { applyFilters, filterByCategories, filterByStorage } from './filter';

const items = [
  { id: 'a', storage_location_id: 's1', ingredient_master_id: 'm1' },
  { id: 'b', storage_location_id: 's2', ingredient_master_id: 'm2' },
  { id: 'c', storage_location_id: 's1', ingredient_master_id: 'm3' },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[];

const catMap = new Map<string, string | null>([
  ['m1', 'c-veg'],
  ['m2', 'c-meat'],
  ['m3', null],
]);

describe('filter.ts', () => {
  it('filterByStorage: storageId null → 그대로', () => {
    expect(filterByStorage(items, null).length).toBe(3);
  });
  it('filterByStorage: 특정 storage', () => {
    expect(filterByStorage(items, 's1').map((i) => i.id)).toEqual(['a', 'c']);
  });
  it('filterByCategories: empty → 그대로', () => {
    expect(filterByCategories(items, [], catMap).length).toBe(3);
  });
  it('filterByCategories: c-veg만', () => {
    expect(filterByCategories(items, ['c-veg'], catMap).map((i) => i.id)).toEqual([
      'a',
    ]);
  });
  it('applyFilters: storage s1 + c-veg', () => {
    expect(applyFilters(items, 's1', ['c-veg'], catMap).map((i) => i.id)).toEqual([
      'a',
    ]);
  });
});
