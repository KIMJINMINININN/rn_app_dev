'use client';

import { Badge } from '@/shared/ui/badge';

import { computeDDay } from '../lib/computeDDay';

export function DDayBadge({
  expiresAt,
}: {
  expiresAt: string | null | undefined;
}) {
  const { days, bucket } = computeDDay(expiresAt);

  const tone =
    bucket === 'expired' || bucket === 'urgent'
      ? 'danger'
      : bucket === 'soon'
        ? 'warning'
        : 'info';

  const label =
    days === null ? '무기한' : days < 0 ? '만료' : `D-${days}`;

  return <Badge tone={tone}>{label}</Badge>;
}
