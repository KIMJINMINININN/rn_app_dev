import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';

/**
 * 미디어 재생 데이터 접근 (client) — PRD F5/AC4 / Develop §5.4.
 *
 * 비공개 버킷(training-media)이라 업로드 영상은 **서명 URL**로만 재생한다(공개 URL 금지).
 * RLS(소유자)로 본인 객체만 서명된다 — 인증된 브라우저 클라이언트가 createSignedUrl 호출.
 * 호출부(UploadVideo)는 `enabled: isAuthEnabled() && storagePath` 로 게이팅한다.
 */

const BUCKET = process.env.NEXT_PUBLIC_MEDIA_BUCKET ?? 'training-media';
/** 서명 URL 만료(초) — T3 기본 10분(재생 세션엔 충분, 공유 누수 최소화). */
export const SIGNED_URL_TTL_SEC = 600;

/** 업로드 영상 storage_path → 재생용 서명 URL(10분). */
export async function fetchSignedMediaUrl(storagePath: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
  if (error || !data) throw error ?? new Error('재생 URL 생성에 실패했습니다.');
  return data.signedUrl;
}
