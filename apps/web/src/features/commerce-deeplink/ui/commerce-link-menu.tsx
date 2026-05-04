// apps/web/src/features/commerce-deeplink/ui/commerce-link-menu.tsx
// Phase 5 §3.5 / §4.3 — features/commerce-deeplink UI.
//
// 책임:
//   - buildCommerceUrl(commerce, name) 결과가 truthy 인 사이트만 anchor 노출
//   - target="_blank" rel="noopener noreferrer" (보안/접근성 표준)
//   - env 토글에 따라 0~2개 버튼 (Pre-flight: bmart 비활성)
//
// Server Component (외부 라이브러리 없음, env 는 Next.js NEXT_PUBLIC_* 빌드타임 inline).

import {
  buildCommerceUrl,
  type Commerce,
} from '@/entities/shopping-item/lib/build-commerce-url';

interface Props {
  ingredientName: string;
}

const SITES: { commerce: Commerce; label: string }[] = [
  { commerce: 'coupang', label: '쿠팡' },
  { commerce: 'kurly', label: '컬리' },
  { commerce: 'bmart', label: 'B마트' },
];

export function CommerceLinkMenu({ ingredientName }: Props) {
  const links = SITES.map((s) => ({
    ...s,
    href: buildCommerceUrl(s.commerce, ingredientName),
  })).filter((l) => l.href.length > 0);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {links.map((l) => (
        <a
          key={l.commerce}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-32 items-center justify-center rounded-xs bg-gray-100 px-12 text-button-s text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors"
          aria-label={`${l.label}에서 ${ingredientName} 검색 (새 탭)`}
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}
