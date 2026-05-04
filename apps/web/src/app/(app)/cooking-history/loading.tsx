// apps/web/src/app/(app)/cooking-history/loading.tsx
// Phase 4 §3.5 — Skeleton (cooking_history fetch 대기).
// Server Component (Next.js loading.tsx 컨벤션).

import { Skeleton } from '@/shared/ui/skeleton';

export default function CookingHistoryLoading() {
  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-baseline justify-between px-16 pt-16">
        <Skeleton variant="text" width={140} height={28} />
        <Skeleton variant="text" width={60} height={14} />
      </div>
      <div className="flex flex-col gap-12 px-16 py-16">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rect" height={96} />
        ))}
      </div>
    </div>
  );
}
