'use client';

import { useInventorySummary } from '../lib/useInventorySummary';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';

interface Props {
  userId: string;
}

export function InventorySummaryHeader({ userId }: Props) {
  const { data, isLoading } = useInventorySummary(userId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-8 px-16 py-8">
        <Skeleton variant="text" width={60} height={20} />
        <Skeleton variant="text" width={60} height={20} />
        <Skeleton variant="text" width={60} height={20} />
      </div>
    );
  }

  const total = data?.total ?? 0;
  const expiring = data?.expiring_soon ?? 0;
  const expired = data?.expired ?? 0;

  return (
    <div className="flex items-center gap-8 px-16 py-8">
      <Badge tone="default">전체 {total}</Badge>
      {expiring > 0 && <Badge tone="warning">임박 {expiring}</Badge>}
      {expired > 0 && <Badge tone="danger">만료 {expired}</Badge>}
    </div>
  );
}
