// apps/web/src/app/(app)/shopping/loading.tsx
// Phase 5 §3.1 — Skeleton (shopping_list fetch 대기).
// Server Component (Next.js loading.tsx 컨벤션).

import { Skeleton } from '@/shared/ui/skeleton';

export default function ShoppingLoading() {
  return (
    <div className="flex flex-col gap-16 px-16 py-16">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width={120} height={28} />
        <Skeleton variant="rect" width={88} height={40} />
      </div>
      <div className="flex flex-col gap-8">
        <Skeleton variant="text" width={80} height={20} />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rect" height={72} />
        ))}
      </div>
    </div>
  );
}
