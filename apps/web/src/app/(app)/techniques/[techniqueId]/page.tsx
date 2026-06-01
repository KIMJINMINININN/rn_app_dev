import Link from 'next/link';
import { EmptyState, ChevronLeftIcon } from '@/shared/ui';
import { DisciplineChip } from '@/entities/discipline';
import { BeltBadge } from '@/entities/rank';
import { CategoryChip, PositionChip } from '@/entities/technique';

/**
 * 기술 상세 셸 (F4/F5/F6 / Design §7d, §9.3) — 워크어블 셸.
 *
 * 뒤로 링크 + 제목 placeholder + DisciplineChip/BeltBadge 슬롯 + 미디어 행 placeholder
 * + 주의점 빨강 박스(§9.3 — 좌측 빨강 바 + --primary-soft 배경) + 역참조 세션 EmptyState.
 *
 * Next 16: params는 Promise → async 페이지에서 await (PRD 라우트 트리 [techniqueId]).
 * TODO(F4/F5/F6): techniqueId로 RSC 페치 → 실제 제목/배지/미디어/설명/주의점/역참조 세션 렌더.
 */
export default async function TechniqueDetailPage({
  params,
}: {
  params: Promise<{ techniqueId: string }>;
}) {
  // 라우팅 검증용으로만 사용(실데이터 페치는 인프라 이후 F4).
  await params;

  return (
    <article className="mx-auto max-w-3xl">
      {/* 뒤로 — 라이브러리 (Design §7d 헤더) */}
      <Link
        href="/techniques"
        className="mb-4 inline-flex items-center gap-1 rounded-xxs py-1 text-button-s text-[var(--text-muted)] outline-none transition-colors pointer-hover:text-[var(--text-default)] focus-visible:shadow-[var(--ring-focus)]"
      >
        <ChevronLeftIcon width={16} height={16} />
        라이브러리
      </Link>

      {/* 제목 placeholder */}
      <h1 className="text-heading-l text-[var(--text-strong)]">기술 이름</h1>

      {/* 종목 + 벨트 + 분류·포지션 슬롯 (Design §7d) */}
      {/* TODO(infra): techniqueId로 기술 페치. 아래 배지/본문은 레이아웃 미리보기용 placeholder(실데이터 아님). */}
      {/* 미디어 "(준비 중)" 행과 동일하게 on-screen "미리보기" 표식 + aria-hidden 으로 AT에서 숨김 — 실데이터로 오인 방지. */}
      <div className="mt-2 flex flex-wrap items-center gap-2" aria-hidden="true">
        <span className="rounded-xxs border border-[var(--border-default)] px-1.5 py-0.5 text-button-xxs text-[var(--text-disabled)]">
          미리보기
        </span>
        <DisciplineChip discipline="bjj_nogi" />
        <BeltBadge belt="blue" stripes={2} />
        <CategoryChip category="submission" size="sm" />
        <PositionChip position="back_control" size="sm" />
      </div>

      <hr className="my-5 border-[var(--border-subtle)]" />

      {/* 미디어 행 placeholder — 내영상 | 유튜브 나란히(데스크톱 2열, §9.1/§10.2) */}
      <h2 className="mb-2 text-heading-xs text-[var(--text-strong)]">미디어</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex aspect-video items-center justify-center rounded-m border border-dashed border-[var(--border-default)] bg-[var(--surface-sunken)] text-body-xs-400 text-[var(--text-disabled)]"
          >
            {i === 0 ? '내 영상 (준비 중)' : 'YouTube (준비 중)'}
          </div>
        ))}
      </div>

      {/* 주의점 빨강 강조 박스 (Design §9.3 / §7d — 좌측 빨강 바 + primary-soft 배경) */}
      <div className="mt-5 overflow-hidden rounded-m border-l-4 border-[var(--primary)] bg-[var(--primary-soft)] p-4">
        <p className="flex items-center gap-1.5 text-button-m font-medium text-[var(--danger)]">
          <span aria-hidden="true">⚠</span>
          주의점 / 디테일
        </p>
        {/* TODO(F6): 마크다운 주의점 본문 렌더(dompurify sanitize). 지금은 placeholder. */}
        <p className="mt-2 text-body-s-400 text-[var(--text-default)]">
          이 기술의 핵심 디테일과 자주 하는 실수를 여기에 정리합니다.
        </p>
      </div>

      <hr className="my-5 border-[var(--border-subtle)]" />

      {/* 역참조 — 이 기술을 다룬 세션 (Design §7d) */}
      <h2 className="mb-1 text-heading-xs text-[var(--text-strong)]">이 기술을 다룬 세션</h2>
      {/* TODO(F4): session_techniques 역참조 쿼리로 세션 목록 렌더. */}
      <EmptyState
        title="아직 연결된 세션이 없습니다"
        description="세션 기록에서 이 기술을 추가하면 여기에 모아 보여줍니다."
      />
    </article>
  );
}
