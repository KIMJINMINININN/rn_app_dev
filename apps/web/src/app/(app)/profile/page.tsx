import { EmptyState, ProfileIcon } from '@/shared/ui';
import { BeltBadge } from '@/entities/rank';

/**
 * 프로필 + 종목별 랭크 (F1 / PRD §7) — 워크어블 셸.
 *
 * 헤더 "프로필" + 종목(랭크 트랙)별 랭크 카드 placeholder + EmptyState.
 * 테마 토글은 상단바(ThemeToggle)에 이미 있으므로 여기선 랭크 영역만(§2.8 — 토글 위치는 F1에서 재배치 가능).
 * TODO(F1): Supabase 인증 + profiles/user_ranks 페치 → 실제 닉네임/벨트/레벨 렌더 + 테마/계정 설정.
 */

/** 표시용 랭크 트랙 카드 메타 (실데이터 연결 전 placeholder). */
const RANK_CARDS = [
  { track: 'bjj', label: '주짓수' },
  { track: 'wrestling', label: '레슬링' },
  { track: 'striking', label: '타격' },
  { track: 'mma', label: 'MMA' },
] as const;

export default function ProfilePage() {
  return (
    <section aria-labelledby="profile-heading" className="mx-auto max-w-3xl">
      <h1 id="profile-heading" className="mb-1 text-heading-l text-[var(--text-strong)]">
        프로필
      </h1>
      {/* TODO(F1): 인증 사용자 닉네임/아바타 */}
      <p className="mb-5 text-body-s-400 text-[var(--text-muted)]">
        계정과 종목별 랭크를 관리합니다. (로그인 연동 예정)
      </p>

      <h2 className="mb-2 text-heading-xs text-[var(--text-strong)]">종목별 랭크</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {RANK_CARDS.map(({ track, label }) => (
          <div
            key={track}
            className="flex items-center justify-between gap-3 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4"
          >
            <span className="text-button-m text-[var(--text-default)]">{label}</span>
            {/* TODO(F1): user_ranks에서 실제 belt/level 반영. bjj만 벨트(§4.3), 그 외는 레벨/미설정. */}
            {track === 'bjj' ? (
              <BeltBadge belt="white" stripes={0} />
            ) : (
              <span className="text-body-xs-400 text-[var(--text-disabled)]">미설정</span>
            )}
          </div>
        ))}
      </div>

      <EmptyState
        className="mt-4"
        icon={<ProfileIcon width={40} height={40} />}
        title="로그인 후 내 기록을 확인하세요"
        description="계정 연동 후 프로필·종목별 랭크·통계가 여기에 표시됩니다."
      />
    </section>
  );
}
