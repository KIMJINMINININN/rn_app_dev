'use client';

import { useState } from 'react';

import type { StorageLocation } from '@/entities/ingredient/model/types';
import { AddIngredientDialog } from '@/features/add-ingredient/ui/add-ingredient-dialog';
import { ManageStorageSheet } from '@/features/manage-storage/ui/manage-storage-sheet';
import { Button } from '@/shared/ui/button';

interface Props {
  userId: string;
  storageLocations: StorageLocation[];
}

export function InventoryActions({ userId, storageLocations }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-8">
        <Button variant="ghost" size="sm" onClick={() => setManageOpen(true)}>
          보관 장소
        </Button>
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          + 추가
        </Button>
      </div>
      <AddIngredientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        storageLocations={storageLocations}
      />
      <ManageStorageSheet
        open={manageOpen}
        onOpenChange={setManageOpen}
        storageLocations={storageLocations}
      />
    </>
  );
}
