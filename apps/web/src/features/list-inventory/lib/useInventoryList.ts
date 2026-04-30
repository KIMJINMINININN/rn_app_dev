'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import type { IngredientWithMaster } from '@/entities/ingredient/model/types';

export type { IngredientWithMaster as InventoryItem } from '@/entities/ingredient/model/types';

export function useInventoryList(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['ingredients', 'list', { userId }],
    enabled: !!userId,
    staleTime: 30 * 1_000,
    queryFn: async (): Promise<IngredientWithMaster[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('user_ingredients')
        .select('*, ingredient_master(name)')
        .eq('user_id', userId!)
        .eq('consumed', false)
        .order('expires_at', { ascending: true, nullsFirst: false });
      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        master: row.ingredient_master ?? { name: '(unknown)' },
      })) as IngredientWithMaster[];
    },
  });
}
