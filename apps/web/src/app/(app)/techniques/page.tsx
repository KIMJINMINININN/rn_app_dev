import { Button, EmptyState, TechniqueIcon, PlusIcon } from '@/shared/ui';

/**
 * 기술 라이브러리 목록 (F4 / Design §7d) — 워크어블 셸.
 *
 * 헤더 "기술 라이브러리" + "+ 기술 추가"(스텁) + 비활성 필터 바(시각 전용) + 빈 카드 그리드 + EmptyState.
 * TODO(F4): 필터([종목][분류][포지션][벨트]) 동작 + RSC로 techniques 페치 + 카드 그리드 렌더.
 */

const FILTERS = ['종목', '분류', '포지션', '벨트'] as const;

export default function TechniquesPage() {
  return (
    <section aria-labelledby="techniques-heading" className="mx-auto max-w-5xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h1 id="techniques-heading" className="text-heading-l text-[var(--text-strong)]">
          기술 라이브러리
        </h1>
        {/* TODO(F4): 기술 생성 폼/모달 열기 */}
        <Button size="sm" disabled aria-label="기술 추가 (준비 중)" className="gap-1.5">
          <PlusIcon width={16} height={16} />
          기술 추가
        </Button>
      </div>

      {/* 비활성 필터 바 — 시각 전용 (Design §7d) */}
      <div className="mb-4 flex flex-wrap items-center gap-2" aria-hidden="true">
        {FILTERS.map((f) => (
          <span
            key={f}
            className="inline-flex h-8 items-center gap-1 rounded-xxs border border-[var(--border-default)] bg-[var(--surface-base)] px-2.5 text-button-xs text-[var(--text-disabled)]"
          >
            {f}
            <span className="text-[var(--text-disabled)]">▾</span>
          </span>
        ))}
      </div>

      {/* 빈 카드 그리드(2~4열, §10.2) — 데이터 연결 전 자리 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="flex flex-col gap-2 rounded-m border border-dashed border-[var(--border-default)] p-3"
          >
            <div className="aspect-video rounded-xs bg-[var(--surface-sunken)]" />
            <div className="h-3.5 w-3/4 rounded-xxs bg-[var(--surface-sunken)]" />
            <div className="h-3 w-1/2 rounded-xxs bg-[var(--surface-sunken)]" />
          </div>
        ))}
      </div>

      <EmptyState
        className="mt-2"
        icon={<TechniqueIcon width={40} height={40} />}
        title="아직 등록한 기술이 없습니다"
        description="기술을 추가하면 종목·벨트 배지와 함께 카드로 정리됩니다. (라이브러리 연동 예정)"
      />
    </section>
  );
}
