import { Button, EmptyState, ProfileIcon } from '@/shared/ui';
import { BeltBadge } from '@/entities/rank';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { logout } from '@/app/(auth)/actions';

/**
 * 프로필 + 종목별 랭크 (F1 / PRD §7) — 계정 정보 + 로그아웃.
 *
 * 헤더 "프로필" + 계정 정보(이메일) + 로그아웃 + 종목(랭크 트랙)별 랭크 placeholder + EmptyState.
 * 계정 정보는 env 게이팅: 인증 ON이면 getUser()로 이메일을, OFF면 "로그인 미연결" 안내를 보여준다.
 * 표시명/타임존/종목별 랭크 편집은 이 단계가 아니다(다음 단계).
 *
 * TODO(F1-next): 표시명/타임존/종목별 랭크 편집.
 */

/** 표시용 랭크 트랙 카드 메타 (실데이터 연결 전 placeholder). */
const RANK_CARDS = [
  { track: 'bjj', label: '주짓수' },
  { track: 'wrestling', label: '레슬링' },
  { track: 'striking', label: '타격' },
  { track: 'mma', label: 'MMA' },
] as const;

export default async function ProfilePage() {
  let email: string | null = null;
  let userId: string | null = null;

  if (isAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
    userId = data.user?.id ?? null;
  }

  return (
    <section aria-labelledby="profile-heading" className="mx-auto max-w-3xl">
      <h1 id="profile-heading" className="mb-1 text-heading-l text-[var(--text-strong)]">
        프로필
      </h1>
      <p className="mb-5 text-body-s-400 text-[var(--text-muted)]">
        계정과 종목별 랭크를 관리합니다.
      </p>

      {/* 계정 정보 + 로그아웃 */}
      <div className="mb-6 flex items-center justify-between gap-3 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
        {isAuthEnabled() ? (
          <div className="min-w-0">
            <p className="truncate text-button-m text-[var(--text-strong)]">
              {email ?? '이메일 없음'}
            </p>
            {userId ? (
              <p className="mt-0.5 truncate text-body-xs-400 text-[var(--text-muted)]">
                {userId}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-body-s-400 text-[var(--text-muted)]">
            로그인 미연결(인프라 후 활성화)
          </p>
        )}
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            로그아웃
          </Button>
        </form>
      </div>

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
