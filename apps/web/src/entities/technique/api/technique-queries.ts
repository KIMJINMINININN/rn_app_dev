import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import type { Technique } from '../model/technique';

/**
 * 기술 라이브러리 entity 데이터 접근 (client) — PRD F4 / Develop §4.5.
 *
 * `createSupabaseBrowserClient()`(publishable 키 + 실 `Database` 타입)로 RLS(본인 행만)
 * 하에 techniques 테이블을 조회한다. calendar-queries 와 동일 관용구.
 *
 * 호출부(TechniqueLibrary)는 이 함수를 `enabled: isAuthEnabled()` 로 게이팅한다 →
 * AUTH OFF(개발 셸)면 쿼리가 비활성 → UI는 휴면 빈 상태 유지(Supabase 호출 없음, infra-last 보존).
 * AUTH ON(현재)이면 실데이터. (Develop §10 게이팅)
 */

/**
 * 사용자 기술 전체 조회(최근순). RLS로 본인 것만 (PRD F4).
 * techniques Row는 Technique 모델과 1:1(snake_case 필드·nullability 동일, enum 동일 union)이므로
 * 마지막에 narrow 캐스트만 적용한다(Row vs zod-inferred 형태 일치, any 미사용).
 */
export async function fetchTechniques(): Promise<Technique[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('techniques')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Technique[];
}
