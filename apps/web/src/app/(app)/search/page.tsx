import { EmptyState, SearchIcon } from '@/shared/ui';

/**
 * 검색 결과 (F8 / Design §7e) — 워크어블 셸.
 *
 * 상단 검색바에서 `?q=` 로 진입. 쿼리 표시 + 기술/세션/태그 그룹 헤더 셸 + EmptyState.
 * Next 16: searchParams는 Promise → async에서 await.
 * TODO(F8): q로 통합 검색(기술명/설명·세션메모/체육관·태그, pg_trgm 부분일치) +
 *   그룹별 결과 행 렌더 + 키워드 하이라이트.
 */

const GROUPS = ['기술', '세션', '태그'] as const;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? '').trim();

  return (
    <section aria-labelledby="search-heading" className="mx-auto max-w-3xl">
      <h1 id="search-heading" className="sr-only">
        검색 결과
      </h1>

      <p className="mb-4 flex items-center gap-2 text-heading-s text-[var(--text-strong)]">
        <SearchIcon width={20} height={20} className="text-[var(--text-muted)]" />
        {q ? (
          <span>
            <span className="text-[var(--text-muted)]">검색:</span>{' '}
            <span className="text-[var(--primary)]">“{q}”</span>
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">검색어를 입력하세요</span>
        )}
      </p>

      {q ? (
        // 그룹 헤더 셸 — 결과 데이터 연결 전 자리 (Design §7e)
        <div className="flex flex-col gap-5">
          {GROUPS.map((group) => (
            <div key={group}>
              <h2 className="mb-1 text-heading-xs text-[var(--text-strong)]">
                {group} <span className="text-[var(--text-muted)]">(0)</span>
              </h2>
              <EmptyState
                className="py-6"
                title={`${group} 결과 없음`}
                description="검색 기능 연동 후 일치하는 항목이 여기에 표시됩니다."
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<SearchIcon width={40} height={40} />}
          title="무엇을 찾고 있나요?"
          description="기술 이름·세션 메모·태그를 한 번에 검색할 수 있습니다."
        />
      )}
    </section>
  );
}
