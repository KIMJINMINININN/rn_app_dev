'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';

export interface InventorySummary {
  total: number;
  expiring_soon: number;
  expired: number;
}

export function useInventorySummary(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['inventory-summary'],
    enabled: !!userId,
    staleTime: 30 * 1_000,
    queryFn: async (): Promise<InventorySummary> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('get_inventory_summary', {
        p_user: userId!,
      });
      if (error) throw error;
      return data?.[0] ?? { total: 0, expiring_soon: 0, expired: 0 };
    },
  });
}
