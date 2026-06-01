'use client';

import { useState } from 'react';
import dayjs from 'dayjs';

import { CalendarMonthGrid } from '@/features/calendar-view';
import { DayDetail } from '@/widgets/day-detail';
import type { CalendarDaySummaryMap, SessionWithDisciplines } from '@/entities/session';
import { ChevronLeftIcon, IconButton, PlusIcon, TodayIcon } from '@/shared/ui';

/**
 * CalendarScreen — F2 캘린더 홈 클라이언트 아일랜드 (Design §7a / §7b / §8 / PRD F2).
 *
 * FSD 메모: 이 컴포넌트는 **app 레이어**라 features(calendar-view) + widgets(day-detail)를
 * 함께 조합할 수 있다. 월 그리드(feature)와 Day Detail(widget)이 공유해야 하는
 * `selectedDate`/`activeStartDate` 상태를 여기로 끌어올려(lift) 양쪽에 props로 내린다
 * → feature↔widget 직접 import 없이 상태 공유(레이어 규칙 준수).
 *
 * 데이터 휴면(infra 전): daySummaries={{}}(빈 맵), sessions=[](빈 배열).
 * 월간 그리드는 오늘만 강조된 빈 달, Day Detail은 EmptyState를 렌더한다.
 *
 * 날짜 처리는 전부 클라이언트(dayjs/new Date) → 서버 page는 searchParams를 읽지 않아
 * /calendar 라우트가 정적(static)으로 유지된다(인증 휴면 + 정적 프리렌더, layout 주석 참고).
 */

/** dayjs 기본 로케일이 영어라 월 라벨은 직접 조립("2026년 5월"). */
function monthLabel(date: Date): string {
  const d = dayjs(date);
  return `${d.year()}년 ${d.month() + 1}월`;
}

export function CalendarScreen() {
  // 초기값: 오늘(선택) / 이번 달(표시). 클라이언트에서 결정 → 라우트 정적 유지.
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [activeStartDate, setActiveStartDate] = useState<Date>(() =>
    dayjs().startOf('month').toDate(),
  );

  // TODO(deep-link): useSearchParams()로 ?date=YYYY-MM-DD 초기값 수용(<Suspense> 경계 필요).
  //   지금은 빌드 정적 유지를 위해 기본 오늘로 두고 딥링크는 보류.

  // TODO(Phase 2/infra): calendar_day_summary 월별 조회로 채움.
  //   activeStartDate의 달 범위로 뷰를 쿼리 → Record<'YYYY-MM-DD', CalendarDaySummary>.
  const daySummaries: CalendarDaySummaryMap = {};

  // TODO(Phase 2/infra): 선택 날짜(selectedDate)의 sessions(+disciplines) 조회로 채움.
  const sessions: SessionWithDisciplines[] = [];

  const goPrevMonth = () => setActiveStartDate((d) => dayjs(d).subtract(1, 'month').startOf('month').toDate());
  const goNextMonth = () => setActiveStartDate((d) => dayjs(d).add(1, 'month').startOf('month').toDate());
  const goToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setActiveStartDate(dayjs(today).startOf('month').toDate());
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── 상단바: 월 네비 ‹ YYYY년 M월 › + 뷰탭 [월]/주/아젠다 + 오늘로 + 세션 (Design §7a) ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* 월 네비 */}
        <div className="flex items-center gap-1">
          <IconButton aria-label="이전 달" size="sm" onClick={goPrevMonth}>
            <ChevronLeftIcon width={20} height={20} />
          </IconButton>
          <h1
            className="min-w-[7.5rem] text-center text-heading-l text-[var(--text-strong)] tabular-nums"
            aria-live="polite"
          >
            {monthLabel(activeStartDate)}
          </h1>
          <IconButton aria-label="다음 달" size="sm" onClick={goNextMonth}>
            {/* ChevronLeft를 좌우반전해 우향 화살표로 재사용(아이콘 추가 없이). */}
            <ChevronLeftIcon width={20} height={20} className="-scale-x-100" />
          </IconButton>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xxs px-2.5 text-button-s text-[var(--text-default)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:bg-[var(--surface-sunken)] focus-visible:shadow-[var(--ring-focus)]"
          >
            <TodayIcon width={16} height={16} />
            오늘로
          </button>
        </div>

        {/* 뷰탭 + 세션 추가 */}
        <div className="flex items-center gap-2">
          {/* 월/주/아젠다 — 주·아젠다는 P1(비활성). */}
          <div
            role="tablist"
            aria-label="캘린더 뷰"
            className="inline-flex items-center gap-0.5 rounded-xs bg-[var(--surface-sunken)] p-0.5"
          >
            <span
              role="tab"
              aria-selected="true"
              className="inline-flex h-7 items-center rounded-xxs bg-[var(--surface-base)] px-2.5 text-button-xs text-[var(--text-strong)] shadow-e1"
            >
              월
            </span>
            <span
              role="tab"
              aria-selected="false"
              aria-disabled="true"
              title="P1"
              className="inline-flex h-7 cursor-not-allowed items-center rounded-xxs px-2.5 text-button-xs text-[var(--text-disabled)]"
            >
              주
            </span>
            <span
              role="tab"
              aria-selected="false"
              aria-disabled="true"
              title="P1"
              className="inline-flex h-7 cursor-not-allowed items-center rounded-xxs px-2.5 text-button-xs text-[var(--text-disabled)]"
            >
              아젠다
            </span>
          </div>

          {/* TODO(F3): 세션 에디터 오픈. 지금은 비활성 스텁(전역 FAB가 1차 진입점). */}
          <button
            type="button"
            disabled
            title="세션 에디터(F3) 예정"
            className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-xxs bg-[var(--surface-sunken)] px-2.5 text-button-s text-[var(--text-disabled)]"
          >
            <PlusIcon width={16} height={16} />
            세션
          </button>
        </div>
      </div>

      {/* ── 본문: 데스크톱(lg+) 그리드+상세 좌우, 그 아래는 세로 스택 (Design §10.2) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* 월간 그리드(feature) — 데이터 휴면: 빈 맵 */}
        <CalendarMonthGrid
          daySummaries={daySummaries}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          activeStartDate={activeStartDate}
          onActiveStartDateChange={setActiveStartDate}
        />

        {/* Day Detail(widget) — 데이터 휴면: 빈 세션 → EmptyState */}
        <DayDetail selectedDate={selectedDate} sessions={sessions} />
      </div>
    </div>
  );
}
