import Link from 'next/link';
import { EmptyState, ChevronLeftIcon, Callout, MarkdownView } from '@/shared/ui';
import { DisciplineChip } from '@/entities/discipline';
import { BeltBadge } from '@/entities/rank';
import { CategoryChip, PositionChip } from '@/entities/technique';

/**
 * 기술 상세 셸 (F4/F5/F6 / Design §7d, §9.3) — 워크어블 셸.
 *
 * 뒤로 링크 + 제목 placeholder + DisciplineChip/BeltBadge 슬롯 + 미디어 행 placeholder
 * + 설명 section + 주의점 Callout 박스(§9.3 — 좌측 빨강 바 + --primary-soft 배경) + 역참조 세션 EmptyState.
 *
 * 설명/주의점 본문은 MarkdownView(F6 — marked→DOMPurify XSS-안전 파이프라인)로 렌더한다.
 * 인프라 이전이라 실데이터가 없어 본문은 "무엇을 적는 곳인지" 안내하는 **지시형 placeholder 마크다운**
 * (DEMO_DESCRIPTION_MD / DEMO_DETAILS_MD) — 가짜 기술의 실제 노트가 아니다. 배지/미디어 행과 동일한
 * 레이아웃 미리보기 성격. 인프라 때 techniqueId로 페치한 실 description_md / details_md로 교체한다.
 *
 * Next 16: params는 Promise → async 페이지에서 await (PRD 라우트 트리 [techniqueId]).
 * TODO(infra): techniqueId로 RSC 페치 → 실제 제목/배지/미디어/설명/주의점/역참조 세션 렌더.
 */

/** 설명 section 미리보기용 지시형 placeholder 마크다운 (실 description_md 아님 — 인프라 때 교체). */
const DEMO_DESCRIPTION_MD =
  '이 기술의 개념과 셋업을 **마크다운**으로 정리합니다.\n\n- 그립/포지션\n- 핵심 디테일';

/** 주의점 Callout 미리보기용 지시형 placeholder 마크다운 (실 details_md 아님 — 인프라 때 교체). */
const DEMO_DETAILS_MD =
  '- 핵심 디테일과 자주 하는 실수를 적어두세요.\n- 견갑 고정처럼 놓치기 쉬운 포인트.';
export default async function TechniqueDetailPage({
  params,
}: {
  params: Promise<{ techniqueId: string }>;
}) {
  // techniqueId는 '수정' 링크/편집 라우트에 사용(실데이터 페치는 인프라 이후 F4).
  const { techniqueId } = await params;

  return (
    <article className="mx-auto max-w-3xl">
      {/* 헤더 행 — 뒤로(라이브러리) + 수정 링크 (Design §7d 헤더) */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/techniques"
          className="inline-flex items-center gap-1 rounded-xxs py-1 text-button-s text-[var(--text-muted)] outline-none transition-colors pointer-hover:text-[var(--text-default)] focus-visible:shadow-[var(--ring-focus)]"
        >
          <ChevronLeftIcon width={16} height={16} />
          라이브러리
        </Link>

        {/* 수정 → 편집 폼(F4-AC1). Button secondary/sm 토큰을 입은 Link(저장은 도먼시). */}
        <Link
          href={`/techniques/${techniqueId}/edit`}
          className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-xxs px-2.5 text-button-s font-medium select-none border border-[var(--border-strong)] bg-[var(--surface-base)] text-[var(--text-default)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:bg-[var(--surface-sunken)] focus-visible:shadow-[var(--ring-focus)]"
        >
          수정
        </Link>
      </div>

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

      {/* 설명 (Design §7d — 주의점 앞). 본문은 MarkdownView(F6). 지금은 지시형 placeholder. */}
      <h2 className="mb-2 mt-5 text-heading-xs text-[var(--text-strong)]">설명</h2>
      <MarkdownView source={DEMO_DESCRIPTION_MD} />

      {/* 주의점 빨강 강조 박스 (Design §9.3 / §7d — Callout danger + MarkdownView 본문). */}
      <Callout variant="danger" title="주의점 / 디테일" className="mt-5">
        <MarkdownView source={DEMO_DETAILS_MD} />
      </Callout>

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
