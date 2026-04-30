'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import type { Database } from '@/shared/api/supabase/types';

export type SearchIngredientMasterResult =
  Database['public']['Functions']['search_ingredient_masters']['Returns'][number];

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
      const { data, error } = await supabase.rpc('search_ingredient_masters', {
        p_query: debouncedQuery,
        p_user_id: userId!,
        p_limit: 10,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}
