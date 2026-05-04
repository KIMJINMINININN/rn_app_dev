'use client';

// apps/web/src/widgets/shopping-list/shopping-list.tsx
// Phase 5 §3.8 — widgets/shopping-list
//
// 책임:
//   - props.items 를 미구매(bought=false) / 구매완료(bought=true) 섹션으로 분리
//   - 각 섹션 ShoppingItemRow 렌더
//   - 빈 상태 처리 ("장바구니가 비어있습니다")
//   - 수동 추가 버튼 (AddShoppingDialog trigger — 본 위젯이 다이얼로그 open state 보유)
//
// FSD: widgets 는 entities/* + features/* + shared/* 사용 가능. 클라이언트 wrapper 인 이유는
// AddShoppingDialog 의 open state 를 관리하기 때문 (RSC + 부분 client 분리도 고려했지만
// state hoist 가 더 단순). 입력 데이터는 RSC page 가 fetch.

import { useMemo, useState } from 'react';

import { ShoppingItemRow } from '@/entities/shopping-item/ui/shopping-item-row';
import type { ShoppingItem } from '@/entities/shopping-item/model/types';
import { AddShoppingDialog } from '@/features/manual-add-shopping/ui/add-shopping-dialog';
import { Button } from '@/shared/ui/button';

interface Props {
  items: ShoppingItem[];
  /** ingredient_master_id → 이름 lookup. RSC 가 미리 fetch. */
  masterNames?: Map<string, string>;
}

export function ShoppingList({ items, masterNames }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { active, bought } = useMemo(() => {
    const a: ShoppingItem[] = [];
    const b: ShoppingItem[] = [];
    for (const item of items) {
      if (item.bought) b.push(item);
      else a.push(item);
    }
    return { active: a, bought: b };
  }, [items]);

  return (
    <div className="flex flex-col gap-16 px-16 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-heading-l text-gray-900">장바구니</h1>
        <Button
          variant="primary"
          size="md"
          onClick={() => setDialogOpen(true)}
          aria-label="장바구니 항목 추가"
        >
          항목 추가
        </Button>
      </header>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Section
            title="미구매"
            count={active.length}
            items={active}
            masterNames={masterNames}
            emptyText="모든 재료를 구매했어요"
          />

          {bought.length > 0 && (
            <Section
              title="구매 완료"
              count={bought.length}
              items={bought}
              masterNames={masterNames}
            />
          )}
        </>
      )}

      <AddShoppingDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

interface SectionProps {
  title: string;
  count: number;
  items: ShoppingItem[];
  masterNames?: Map<string, string>;
  emptyText?: string;
}

function Section({ title, count, items, masterNames, emptyText }: SectionProps) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-baseline gap-8">
        <h2 className="text-heading-s text-gray-900">{title}</h2>
        <span className="text-body-xs-400 text-gray-500">{count}개</span>
      </div>
      {items.length === 0 ? (
        emptyText ? (
          <p className="text-body-s-400 text-gray-500">{emptyText}</p>
        ) : null
      ) : (
        <ul className="flex flex-col gap-8">
          {items.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              masterNames={masterNames}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-12 px-16 py-32">
      <p className="text-heading-s text-gray-700">장바구니가 비어있습니다</p>
      <p className="text-body-s-400 text-gray-500 text-center">
        레시피 상세에서 &lsquo;부족 재료 담기&rsquo; 버튼을 누르거나
        <br />
        직접 항목을 추가하세요.
      </p>
    </div>
  );
}
