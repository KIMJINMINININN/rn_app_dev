'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { techniqueInsertSchema, type TechniqueInsert } from '@/entities/technique';

/**
 * 기술 생성/편집 Server Actions (F4-AC1 / Design §7d, 0005_techniques.sql).
 *
 * 도먼시(dormancy, 인프라-last): 플래그 OFF면 **stale Supabase로 호출하지 않고** 안내만 반환한다
 * ((auth)/actions.ts · log-session-action.ts · profile-actions.ts 패턴 미러).
 * 인프라 단계에서 NEXT_PUBLIC_AUTH_ENABLED 를 켜면 그대로 INSERT/UPDATE 가 동작한다.
 *
 * techniques.insert / update 는 RLS(소유자 한정)로 보호된다 — user_id 조건/페이로드는 getUser()로 채운다.
 * 미디어(F5)·태그(F7) 연결(media_links/taggables)은 영속화 후속이라 여기서 다루지 않는다
 * (위젯 폼이 드래프트만 수집, 아래 호출부 seam 주석 참고).
 */

/** 기술 액션 결과 — 클라이언트 폼이 토스트 분기(ok/dormant/error)에 사용. */
export type TechniqueActionResult =
  | { ok: true; techniqueId: string }
  | { ok: false; dormant?: boolean; error: string };

const INFRA_DISABLED_MESSAGE =
  '기술 저장은 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';

/**
 * 기술 생성 (F4-AC1) → `techniques` insert(소유자 = getUser()).
 * visibility 는 입력에서 생략 시 DB default 'private' 이지만, 폼이 명시적으로 'private' 을 보낸다.
 */
export async function createTechnique(rawInput: TechniqueInsert): Promise<TechniqueActionResult> {
  const parsed = techniqueInsertSchema.safeParse(rawInput);
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

  // db:types 생성(인프라) 후 실타입 — .from('techniques') 제네릭이 Insert 컬럼을 안다.
  const row = { user_id: user.id, ...input };
  const { data, error } = await supabase
    .from('techniques')
    .insert(row)
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? '기술 저장에 실패했습니다.' };
  }

  revalidatePath('/techniques');
  return { ok: true, techniqueId: data.id };
}

/**
 * 기술 편집 (F4-AC1) → `techniques` update(id + user_id 조건, RLS 본인 행만).
 * id 는 라우트 [techniqueId]에서 받고, 페이로드는 생성과 동일 스키마(techniqueInsertSchema)다.
 */
export async function updateTechnique(
  id: string,
  rawInput: TechniqueInsert,
): Promise<TechniqueActionResult> {
  const parsed = techniqueInsertSchema.safeParse(rawInput);
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

  // db:types 생성(인프라) 후 실타입 — .from('techniques') 제네릭이 Update 컬럼을 안다.
  const { error } = await supabase
    .from('techniques')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/techniques');
  return { ok: true, techniqueId: id };
}
