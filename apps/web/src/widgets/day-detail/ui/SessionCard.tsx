import { DisciplineChip } from '@/entities/discipline';
import {
  CLASS_TYPE_LABELS,
  intensityDots,
  type SessionWithDisciplines,
} from '@/entities/session';

/**
 * SessionCard — Day Detail의 단일 세션 카드 (Design §7b / F2-AC3).
 *
 * 헤더: DisciplineChip(들) + 수업유형 라벨 + 시간(분) + 강도 5단계 점(●●●○○).
 * 메타: 체육관 · 파트너 한 줄.
 * 본문: 다룬 기술 / 미디어 / 메모 / 태그 섹션 — 이들은 더 깊은 데이터(세션-기술 로그,
 *   media, tags)에 의존하므로 지금은 섹션 라벨 + 플레이스홀더만. 가짜 데이터 금지.
 *
 * 표시 전용(상호작용 없음) → 서버 컴포넌트. 토큰 + `--shadow-card`로 클린 카드.
 */

export interface SessionCardProps {
  session: SessionWithDisciplines;
}

/** 강도 5단계 점 (Design §7b ●●●○○). null/0이면 전부 빈 점. */
function IntensityDots({ intensity }: { intensity: number | null }) {
  const dots = intensityDots(intensity ?? 0);
  return (
    <span
      className="inline-flex items-center gap-0.5 align-middle"
      role="img"
      aria-label={`강도 ${intensity ?? 0} / 5`}
    >
      {dots.map((filled, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={[
            'size-1.5 rounded-full',
            filled ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]',
          ].join(' ')}
        />
      ))}
    </span>
  );
}

/** "다룬 기술 / 미디어 / 메모 / 태그" 공통 섹션 라벨 헤더. */
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-button-xs text-[var(--text-muted)]">{children}</p>
  );
}

export function SessionCard({ session }: SessionCardProps) {
  const classTypeLabel = session.class_type ? CLASS_TYPE_LABELS[session.class_type] : null;

  return (
    <article className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 shadow-[var(--shadow-card)] md:p-4">
      {/* 헤더 — 종목 칩(들) + 유형 · 시간 · 강도 */}
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="flex flex-wrap items-center gap-1">
          {session.disciplines.map((d) => (
            <DisciplineChip key={d} discipline={d} size="sm" />
          ))}
        </span>

        <span className="flex items-center gap-1.5 text-body-xs-500 text-[var(--text-default)]">
          {classTypeLabel && <span>{classTypeLabel}</span>}
          {session.duration_min != null && (
            <>
              <span aria-hidden="true" className="text-[var(--text-disabled)]">·</span>
              <span className="tabular-nums">{session.duration_min}분</span>
            </>
          )}
          {session.intensity != null && (
            <>
              <span aria-hidden="true" className="text-[var(--text-disabled)]">·</span>
              <span className="flex items-center gap-1 text-[var(--text-muted)]">
                강도 <IntensityDots intensity={session.intensity} />
              </span>
            </>
          )}
        </span>
      </header>

      {/* 메타 — 체육관 · 파트너 */}
      {(session.gym || session.partners) && (
        <p className="mt-2 text-body-xs-400 text-[var(--text-muted)]">
          {session.gym && <span>📍 {session.gym}</span>}
          {session.gym && session.partners && <span aria-hidden="true"> · </span>}
          {session.partners && <span>파트너: {session.partners}</span>}
        </p>
      )}

      {/* 본문 섹션 — 데이터 미연동(F3/F4/F5 이후). 라벨 + 플레이스홀더만. */}
      <div className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-3">
        {/* TODO(F4): 세션-기술 로그(session_techniques) 연동 — 기술명 + DisciplineChip + (주짓수)BeltBadge + 그날 메모 행. */}
        <section className="space-y-1">
          <SectionLabel>다룬 기술</SectionLabel>
          <p className="text-body-xs-400 text-[var(--text-disabled)]">기술 기록 연동 예정</p>
        </section>

        {/* TODO(F5): media 연동 — 내 영상/유튜브/외부 링크 카드 행(Design §9). */}
        <section className="space-y-1">
          <SectionLabel>미디어</SectionLabel>
          <p className="text-body-xs-400 text-[var(--text-disabled)]">영상/링크 연동 예정</p>
        </section>

        {/* 메모(memo_md)는 세션 본체에 있으므로 값이 있으면 표시, 없으면 플레이스홀더. */}
        <section className="space-y-1">
          <SectionLabel>메모</SectionLabel>
          {session.memo_md ? (
            // TODO(F6): memo_md 마크다운 렌더. 지금은 평문(줄바꿈 보존).
            <p className="whitespace-pre-line text-body-s-400 text-[var(--text-default)]">
              {session.memo_md}
            </p>
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">메모 없음</p>
          )}
        </section>

        {/* TODO(F4): tags 연동 — TagChip 행. */}
        <section className="space-y-1">
          <SectionLabel>태그</SectionLabel>
          <p className="text-body-xs-400 text-[var(--text-disabled)]">태그 연동 예정</p>
        </section>
      </div>
    </article>
  );
}
