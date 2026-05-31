import { Skeleton } from '@/shared/ui';

/** 캘린더 서스펜스 폴백 (Develop §6b) — 헤더 + 월 그리드 스켈레톤. */
export default function CalendarLoading() {
  return (
    <section className="mx-auto max-w-5xl" aria-busy="true" aria-label="캘린더 로딩 중">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="overflow-hidden rounded-m border border-[var(--border-subtle)]">
        <div className="grid grid-cols-7 gap-px bg-[var(--border-subtle)]">
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-none md:h-24" />
          ))}
        </div>
      </div>
    </section>
  );
}
