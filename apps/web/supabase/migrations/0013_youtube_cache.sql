create table youtube_cache (
  query_key text primary key,            -- e.g., "recipe:김치찌개"
  payload jsonb not null,                -- YouTube API 응답 일부 (아래 명시)
  fetched_at timestamptz not null default now()
);
-- 24h 후 stale 처리: SELECT 시 fetched_at + interval '24 hours' > now() 체크

-- payload jsonb schema (TypeScript 기준):
-- type YoutubeCachePayload = Array<{
--   videoId: string;
--   title: string;
--   thumbnails: { medium: { url: string; width: number; height: number } };
--   channelTitle: string;
--   durationSeconds?: number;   // contentDetails.duration 파싱 후 저장 (선택)
-- }>;  // 길이 ≤ 5

-- ───────── RLS ─────────
alter table youtube_cache enable row level security;
create policy "anyone_can_read" on youtube_cache for select using (true);
-- INSERT/UPDATE는 admin client(service role)에서만 → RLS bypass
