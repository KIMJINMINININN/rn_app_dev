'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { logSessionInputSchema, type LogSessionInput } from '../model/log-session-schema';

/** logSession 결과 — 클라이언트 폼이 토스트 분기에 사용. */
export type LogSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; dormant?: boolean; error: string };

const INFRA_DISABLED_MESSAGE =
  '세션 저장은 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';

/**
 * 세션 기록 Server Action (F3 / Develop §12, 0013_log_session.sql).
 * 도먼시: 플래그 OFF면 stale Supabase로 호출하지 않고 안내만 반환((auth)/actions.ts 패턴).
 */
export async function logSession(rawInput: LogSessionInput): Promise<LogSessionResult> {
  const parsed = logSessionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' };
  }
  const input = parsed.data;

  if (!isAuthEnabled()) {
    return { ok: false, dormant: true, error: INFRA_DISABLED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  const args = {
    p_user: user.id,
    p_trained_on: input.trained_on,
    p_gym: input.gym ?? null,
    p_class_type: input.class_type ?? null,
    p_duration_min: input.duration_min ?? null,
    p_intensity: input.intensity ?? null,
    p_rounds: input.rounds ?? null,
    p_partners: input.partners ?? null,
    p_memo_md: input.memo_md ?? null,
    p_rating: input.rating ?? null,
    p_disciplines: input.disciplines,
    p_techniques: input.techniques,
    p_tag_ids: input.tag_ids,
    p_media: input.media,
  };

  // types.ts는 인프라 전 placeholder(Functions: never)라 rpc 제네릭이 'log_session'을
  // 모른다 → db:types 생성(인프라) 후 이 캐스트 제거. (Develop §4.7 / §13)
  // 캐스트 파라미터명은 `args`와 달리해 자기참조(TS2502)를 피한다(typeof는 외부 const 참조).
  const rpc = supabase.rpc as unknown as (
    fn: 'log_session',
    rpcArgs: typeof args,
  ) => Promise<{ data: string | null; error: { message: string } | null }>;

  const { data, error } = await rpc('log_session', args);
  if (error || !data) {
    return { ok: false, error: error?.message ?? '세션 저장에 실패했습니다.' };
  }

  revalidatePath('/calendar');
  return { ok: true, sessionId: data };
}
