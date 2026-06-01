import { TagsView } from './tags-view';

/**
 * 태그 보기 (F7-AC2/AC3 / Design §7f).
 *
 * 헤더("태그 보기") + TagsView(선택 AND 바 + 결과 그룹). 선택/필터 상호작용은 **동작**한다(client 아일랜드).
 *
 * 데이터 휴면(infra 전): availableTags=[](빈 배열)을 client 아일랜드에 내린다 — 고를 태그가 없고
 * 결과는 EmptyState 로 떨어진다(가짜 태그/항목 금지, techniques/page 패턴과 동일).
 * page 는 searchParams/Supabase 를 읽지 않아 /tags 라우트가 정적(○ Static)으로 유지된다.
 */
export default function TagsPage() {
  // TODO(infra): 사용자 tags 조회로 availableTags 채움 + 선택 태그로 taggables AND 조회.
  const availableTags: string[] = [];

  return (
    <section aria-labelledby="tags-heading" className="mx-auto max-w-5xl">
      <h1 id="tags-heading" className="mb-4 text-heading-l text-[var(--text-strong)]">
        태그 보기
      </h1>

      <TagsView availableTags={availableTags} />
    </section>
  );
}
