// apps/web/src/app/(app)/recipes/loading.tsx
// Phase 3 §3.7 — Skeleton (RPC `recommend_recipes` 응답 대기 중 표시).
// Server Component (Next.js loading.tsx 컨벤션).

import { Skeleton } from '@/shared/ui/skeleton';

export default function RecipesLoading() {
  return (
    <div className="flex flex-col gap-32 px-16 py-16">
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <section className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" width={180} height={24} />
        <Skeleton variant="text" width={140} height={14} />
      </div>
      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rect" height={120} />
        ))}
      </div>
    </section>
  );
}
