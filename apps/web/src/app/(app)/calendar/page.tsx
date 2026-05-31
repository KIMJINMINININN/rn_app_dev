import dayjs from 'dayjs';
import { EmptyState, CalendarIcon, PlusIcon } from '@/shared/ui';

/**
 * 캘린더 홈 (F2 / Design §7a) — 워크어블 셸.
 *
 * 헤더 "YYYY년 M월"(dayjs) + 월 네비 자리 + 정적 7열 월 그리드 스켈레톤 + EmptyState.
 * TODO(F2): react-calendar 연결(tileContent=종목 점+세션 수, tileClassName=오늘/선택),
 *   월 이동·"오늘로"·Day Detail 패널. 지금은 데이터/인터랙션 없는 정적 골격.
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 해당 월 그리드를 채우는 6주(42칸) 날짜 배열 — 일요일 시작. */
function buildMonthGrid(base: dayjs.Dayjs): { date: number; inMonth: boolean; isToday: boolean }[] {
  const startOfMonth = base.startOf('month');
  const gridStart = startOfMonth.subtract(startOfMonth.day(), 'day'); // 그 주 일요일로 back
  const today = dayjs();
  return Array.from({ length: 42 }, (_, i) => {
    const d = gridStart.add(i, 'day');
    return {
      date: d.date(),
      inMonth: d.month() === base.month(),
      isToday: d.isSame(today, 'day'),
    };
  });
}

export default function CalendarPage() {
  const now = dayjs();
  const monthLabel = `${now.year()}년 ${now.month() + 1}월`;
  const cells = buildMonthGrid(now);

  return (
    <section aria-labelledby="calendar-heading" className="mx-auto max-w-5xl">
      {/* 월 네비 + 뷰탭 자리 + 추가 (Design §7a) */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h1 id="calendar-heading" className="text-heading-l text-[var(--text-strong)]">
          {monthLabel}
        </h1>
        {/* TODO(F2): "+ 세션" → 세션 에디터 / 월 이동(‹ ›) / 월·주·아젠다 뷰탭 */}
        <span
          className="inline-flex h-8 items-center gap-1.5 rounded-xxs bg-[var(--surface-sunken)] px-2.5 text-button-s text-[var(--text-disabled)]"
          aria-disabled="true"
        >
          <PlusIcon width={16} height={16} />
          세션
        </span>
      </div>

      {/* 월 그리드 스켈레톤 — 데이터/인터랙션 없는 정적 골격 */}
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)]"
      >
        <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={[
                'py-2 text-center text-button-xs',
                i === 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]',
              ].join(' ')}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => (
            <div
              key={i}
              className={[
                'min-h-16 border-b border-r border-[var(--border-subtle)] p-1.5 md:min-h-24',
                (i + 1) % 7 === 0 ? 'border-r-0' : '',
                i >= 35 ? 'border-b-0' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-flex size-6 items-center justify-center rounded-full text-body-xs-500 tabular-nums',
                  cell.isToday
                    ? 'bg-[var(--primary)] text-[var(--text-on-primary)]'
                    : cell.inMonth
                      ? 'text-[var(--text-default)]'
                      : 'text-[var(--text-disabled)]',
                ].join(' ')}
              >
                {cell.date}
              </span>
            </div>
          ))}
        </div>
      </div>

      <EmptyState
        className="mt-2"
        icon={<CalendarIcon width={40} height={40} />}
        title="훈련 기록을 시작하세요"
        description="날짜 셀을 눌러 그날의 세션을 추가하면, 종목 점과 세션 수가 여기에 표시됩니다. (캘린더 연동 예정)"
      />
    </section>
  );
}
