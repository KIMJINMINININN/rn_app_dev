// apps/web/src/app/api/youtube/search/route.ts
// Phase 3 §3.7 / §4.3 — YouTube proxy Route Handler.
//
// 본 파일은 Next.js 16 Route Handler signature 만 노출.
// 실제 로직(cache lookup / YouTube fetch / cache write)은
// features/youtube-embed/api/route-handler 에 분리되어 있음 (FSD: app은 routing만).
//
// ★ YOUTUBE_API_KEY 클라이언트 노출 절대 금지 — Route Handler 내부에서만 참조.
// ★ youtube_cache write는 admin client(service role) — RLS bypass.

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  fetchYouTube,
  isCacheFresh,
  lookupCache,
  writeCache,
  type YoutubeCachePayload,
} from '@/features/youtube-embed/api/route-handler';
import { createSupabaseAdminClient } from '@/shared/api/supabase/admin';

// search params + DB write 사용 → request-time 강제.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q');
  if (!q) {
    return Response.json({ ok: false, error: '검색어가 없습니다' });
  }

  const queryKey = `recipe:${q}`;
  const supabase =
    createSupabaseAdminClient() as unknown as SupabaseClient;

  // 1. cache lookup (24h TTL)
  const cached = await lookupCache(supabase, queryKey);
  if (cached && isCacheFresh(cached.fetched_at)) {
    console.info(`[youtube_cache] HIT for "${queryKey}"`);
    return Response.json({ ok: true, data: cached.payload });
  }

  console.info(`[youtube_cache] MISS for "${queryKey}"`);

  // 2. API key guard (개발환경 graceful)
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[youtube] YOUTUBE_API_KEY not set');
    return Response.json({ ok: true, data: [] satisfies YoutubeCachePayload });
  }

  // 3. YouTube API 호출
  try {
    const result = await fetchYouTube(apiKey, q);

    if (result.warning === 'quotaExceeded') {
      console.warn('[youtube] quota exceeded');
      return Response.json({
        ok: true,
        data: [] satisfies YoutubeCachePayload,
        warning: 'quotaExceeded',
      });
    }

    const payload = result.payload ?? [];

    // 4. cache write (admin client, fire-and-forget 의미상 await — 다음 요청 hit 보장)
    await writeCache(supabase, queryKey, payload);

    return Response.json({ ok: true, data: payload });
  } catch (e) {
    console.error('[youtube] API call failed', e);
    return Response.json({ ok: true, data: [] satisfies YoutubeCachePayload });
  }
}
