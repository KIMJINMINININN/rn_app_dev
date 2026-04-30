'use client';

import { useState } from 'react';

import type { StorageLocation } from '@/entities/ingredient/model/types';
import { AddIngredientDialog } from '@/features/add-ingredient/ui/add-ingredient-dialog';
import { Button } from '@/shared/ui/button';

interface Props {
  userId: string;
  storageLocations: StorageLocation[];
}

export function InventoryActions({ userId, storageLocations }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
        + 추가
      </Button>
      <AddIngredientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        storageLocations={storageLocations}
      />
    </>
  );
}
