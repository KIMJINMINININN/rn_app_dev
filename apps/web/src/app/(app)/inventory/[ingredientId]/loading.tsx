// apps/web/src/app/(app)/inventory/[ingredientId]/loading.tsx
// Phase 4 §3.5 — Skeleton (RPC `recommend_for_ingredient` 응답 대기 중 표시).
// Server Component (Next.js loading.tsx 컨벤션). Phase 3 recipes/loading.tsx 패턴 동일.

import { Skeleton } from '@/shared/ui/skeleton';

export default function IngredientRecommendationLoading() {
  return (
    <div className="flex flex-col gap-24 px-16 py-16">
      {/* 헤더 자리 */}
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" width={200} height={28} />
        <Skeleton variant="text" width={160} height={14} />
      </div>

      {/* 좌/우 섹션 자리 */}
      <div className="grid grid-cols-1 gap-32 sm:grid-cols-2">
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
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
      <div className="flex flex-col gap-12">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rect" height={88} />
        ))}
      </div>
    </section>
  );
}
