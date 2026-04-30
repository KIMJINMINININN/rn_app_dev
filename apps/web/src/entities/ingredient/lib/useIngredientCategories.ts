'use client';

import { useQuery } from '@tanstack/react-query';

import type { IngredientCategory } from '@/entities/ingredient/model/types';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';

export function useIngredientCategories(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['ingredient-categories'],
    enabled: !!userId,
    staleTime: 60 * 60 * 1_000,
    queryFn: async (): Promise<IngredientCategory[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('ingredient_categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}
