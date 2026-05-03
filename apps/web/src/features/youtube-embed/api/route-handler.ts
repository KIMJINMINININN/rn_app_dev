import 'server-only';

// apps/web/src/features/youtube-embed/api/route-handler.ts
// Phase 3 §3.3 — features/youtube-embed Route Handler 로직.
//
// 본 모듈은 helpers + 도메인 타입만 노출한다. 실제 GET export는
// app/api/youtube/search/route.ts 에서 wrap (FSD: features는 라우팅 안 가짐).
//
// ★ apiKey (process.env.YOUTUBE_API_KEY) 는 server-only.
// ★ youtube_cache write는 admin client(service role) — RLS bypass 필요 (conventions.md §14).
// ★ Database 자동 생성 타입에 `youtube_cache`가 아직 없어 call site에서 untyped client cast.

import type { SupabaseClient } from '@supabase/supabase-js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const YOUTUBE_MAX_RESULTS = 5;
const YOUTUBE_SEARCH_ENDPOINT =
  'https://www.googleapis.com/youtube/v3/search';

// payload jsonb schema (db-schema.md §3.2 0013 / 0013_youtube_cache.sql 주석과 동일)
// 길이 ≤ 5
export type YoutubeCachePayload = Array<{
  videoId: string;
  title: string;
  thumbnails: {
    medium: { url: string; width: number; height: number };
  };
  channelTitle: string;
  durationSeconds?: number;
}>;

export type CacheLookupResult = {
  payload: YoutubeCachePayload;
  fetched_at: string;
} | null;

export type YouTubeFetchResult = {
  payload?: YoutubeCachePayload;
  warning?: 'quotaExceeded';
};

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * youtube_cache 테이블에서 query_key 일치하는 row 조회.
 * 24h TTL 체크는 호출자가 fetched_at 으로 직접 수행 (isCacheFresh 사용).
 */
export async function lookupCache(
  supabase: SupabaseClient,
  queryKey: string,
): Promise<CacheLookupResult> {
  const { data, error } = await supabase
    .from('youtube_cache')
    .select('payload, fetched_at')
    .eq('query_key', queryKey)
    .maybeSingle();

  if (error || !data) return null;

  return {
    payload: (data.payload ?? []) as YoutubeCachePayload,
    fetched_at: data.fetched_at as string,
  };
}

export function isCacheFresh(fetchedAt: string, now: number = Date.now()): boolean {
  return new Date(fetchedAt).getTime() + CACHE_TTL_MS > now;
}

/**
 * YouTube Data API v3 search.list 호출 (100 quota unit).
 * - quotaExceeded → { warning: 'quotaExceeded' }
 * - 네트워크 오류 → throw (호출자가 catch 처리)
 */
export async function fetchYouTube(
  apiKey: string,
  q: string,
): Promise<YouTubeFetchResult> {
  const url = new URL(YOUTUBE_SEARCH_ENDPOINT);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', q);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(YOUTUBE_MAX_RESULTS));
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  const json = (await res.json()) as Record<string, unknown>;

  const errorObj = json.error as
    | { errors?: Array<{ reason?: string }> }
    | undefined;
  const reason = errorObj?.errors?.[0]?.reason;
  if (reason === 'quotaExceeded') {
    return { warning: 'quotaExceeded' };
  }

  const items = (json.items ?? []) as Array<Record<string, unknown>>;
  const payload: YoutubeCachePayload = items
    .map((item) => {
      const idObj = item.id as { videoId?: string } | undefined;
      const snippet = item.snippet as
        | {
            title?: string;
            channelTitle?: string;
            thumbnails?: {
              medium?: { url?: string; width?: number; height?: number };
              default?: { url?: string; width?: number; height?: number };
            };
          }
        | undefined;
      const videoId = idObj?.videoId;
      if (!videoId || !snippet) return null;
      const thumb = snippet.thumbnails?.medium ?? snippet.thumbnails?.default;
      if (!thumb?.url) return null;
      return {
        videoId,
        title: snippet.title ?? '',
        thumbnails: {
          medium: {
            url: thumb.url,
            width: thumb.width ?? 320,
            height: thumb.height ?? 180,
          },
        },
        channelTitle: snippet.channelTitle ?? '',
      };
    })
    .filter((v): v is YoutubeCachePayload[number] => v !== null);

  return { payload };
}

/**
 * youtube_cache upsert (admin client 필수 — RLS bypass).
 * 실패는 silently swallow (캐시 미스 시 다시 fetch하면 되므로 사용자 경험에 영향 X).
 */
export async function writeCache(
  supabase: SupabaseClient,
  queryKey: string,
  payload: YoutubeCachePayload,
): Promise<void> {
  const { error } = await supabase.from('youtube_cache').upsert({
    query_key: queryKey,
    payload,
    fetched_at: new Date().toISOString(),
  });
  if (error) {
    console.error('[youtube_cache] write failed', error);
  }
}
