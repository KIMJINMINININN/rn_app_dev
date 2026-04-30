import type { Metadata } from 'next';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { InventoryActions } from '@/widgets/inventory-list/ui/inventory-actions';
import { InventoryList } from '@/widgets/inventory-list/ui/inventory-list';

export const metadata: Metadata = {
  title: '인벤토리',
};

export default async function InventoryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: storageLocations = [] } = await supabase
    .from('storage_locations')
    .select('*')
    .order('sort_order');

  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-center justify-between px-16 pt-16">
        <h1 className="text-heading-l text-gray-900">내 인벤토리</h1>
        <InventoryActions
          userId={user!.id}
          storageLocations={storageLocations ?? []}
        />
      </div>
      <InventoryList
        userId={user!.id}
        storageLocations={storageLocations ?? []}
      />
    </div>
  );
}
