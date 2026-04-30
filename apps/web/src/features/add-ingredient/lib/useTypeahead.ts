'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import type { Database } from '@/shared/api/supabase/types';

// 0008b RPC 콘솔 적용 후 db:types 재실행하면 Database['public']['Functions']['search_ingredient_masters']로 자동 추론됨.
// 그 전까지는 수동 타입 + rpc 호출 시 type assertion 사용 (TODO 제거).
export type SearchIngredientMasterResult = {
  id: string;
  name: string;
  category_id: string | null;
  default_shelf_life_days: number | null;
  default_storage_kind: Database['public']['Enums']['storage_kind'] | null;
  rank: number;
};

function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function useIngredientTypeahead(
  query: string,
  userId: string | null | undefined,
) {
  const debouncedQuery = useDebounced(query, 250);
  const enabled = debouncedQuery.trim().length > 0 && !!userId;

  return useQuery({
    queryKey: ['ingredients', 'search', debouncedQuery],
    enabled,
    staleTime: 30 * 1_000,
    queryFn: async (): Promise<SearchIngredientMasterResult[]> => {
      const supabase = createSupabaseBrowserClient();
      // TODO: 0008b 콘솔 적용 + db:types 재실행 후 type assertion 제거
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('search_ingredient_masters', {
        p_query: debouncedQuery,
        p_user_id: userId!,
        p_limit: 10,
      });
      if (error) throw error;
      return (data ?? []) as SearchIngredientMasterResult[];
    },
  });
}
