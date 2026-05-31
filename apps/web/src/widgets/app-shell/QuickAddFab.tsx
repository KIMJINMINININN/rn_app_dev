'use client';

import { PlusIcon } from '@/shared/ui';

/**
 * QuickAddFab — 전역 빠른 추가 FAB (PRD §7 / Design §7a "오늘 세션 추가").
 *
 * 빨강 원형 버튼, 우하단 `fixed`. 모바일에선 BottomNav 위에 떠야 하므로
 * `bottom`을 탭바 높이 + safe-area만큼 띄운다(겹침 방지, §10.3).
 * onClick은 아직 동작 없음(인프라/세션 에디터 미구현) — 가짜 라우팅 금지.
 */
export function QuickAddFab() {
  function handleClick() {
    // TODO(F3): 세션 에디터(widgets/session-editor) 열기 — 모바일=바텀시트 / 웹=모달.
    // 현재는 인프라/에디터 미구현이라 no-op. 가짜 페이지로 라우팅하지 않는다.
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="세션 추가"
      title="오늘 세션 추가"
      className={[
        'fixed right-4 z-40 inline-flex size-14 items-center justify-center rounded-full',
        'bg-[var(--primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-e3)]',
        'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        'pointer-hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]',
        'outline-none focus-visible:shadow-[var(--ring-focus)]',
        // 모바일: BottomNav(약 56px) + safe-area 위로 띄움. md+: 사이드 내비라 일반 여백.
        'bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] md:bottom-6',
      ].join(' ')}
    >
      <PlusIcon width={26} height={26} />
    </button>
  );
}
