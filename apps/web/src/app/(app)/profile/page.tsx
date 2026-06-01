import { Button } from '@/shared/ui';
import { ProfileRankEditor } from '@/features/edit-profile';
import type { ProfileUpdate } from '@/entities/profile';
import type { UserRankUpsert } from '@/entities/rank';
import type { RankTrack } from '@/shared/model/enums';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { logout } from '@/app/(auth)/actions';

/**
 * 프로필 + 종목별 랭크 (F1 / PRD §7) — 계정 정보 + 로그아웃 + 표시명/타임존/랭크 편집(5b).
 *
 * RSC는 정적으로 유지한다(인프라-last): 계정 정보(이메일/userId)만 env 게이팅으로 getUser()를
 * 호출하고(플래그 OFF면 호출 없음 → 정적), 편집 UI는 클라이언트 섬(ProfileRankEditor)에 위임한다.
 * 인프라 전이라 편집 초기값은 가짜 데이터 없이 빈/기본값을 내려준다(저장은 도먼시 — env 게이팅).
 *
 * SSoT: docs/mma/Develop.md §0003·§0004 / PRD F1-AC3·AC4
 */

/** 인프라 전 도먼시 기본값 — 가짜 데이터 금지(빈 표시명 / 서울 타임존). */
const DORMANT_PROFILE: ProfileUpdate = { display_name: '', timezone: 'Asia/Seoul' };

export default async function ProfilePage() {
  let email: string | null = null;
  let userId: string | null = null;

  if (isAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
    userId = data.user?.id ?? null;
  }

  // TODO(infra): profiles + user_ranks 조회로 초기값 채움(현재는 도먼시 기본/미설정).
  const initialProfile = DORMANT_PROFILE;
  const initialRanks: Partial<Record<RankTrack, UserRankUpsert>> = {};

  return (
    <section aria-labelledby="profile-heading" className="mx-auto max-w-3xl">
      <h1 id="profile-heading" className="mb-1 text-heading-l text-[var(--text-strong)]">
        프로필
      </h1>
      <p className="mb-5 text-body-s-400 text-[var(--text-muted)]">
        계정과 종목별 랭크를 관리합니다.
      </p>

      {/* 계정 정보 + 로그아웃 */}
      <div className="mb-5 flex items-center justify-between gap-3 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
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

      {/* 표시명/타임존 + 종목별 랭크 편집 (클라이언트 섬) — 저장은 도먼시(env 게이팅) */}
      <ProfileRankEditor initialProfile={initialProfile} initialRanks={initialRanks} />
    </section>
  );
}
