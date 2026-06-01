'use client';

import { useState } from 'react';

import { TagInput } from '@/features/tag-filter';
import { EmptyState, SearchIcon } from '@/shared/ui';

/**
 * TagsView — 태그 보기 클라이언트 아일랜드 (F7-AC2/AC3 / Design §7f).
 *
 * 선택 태그 상태(useState)를 소유하고, AND 필터 바(TagInput, 필터 모드) + 결과 영역을 조합한다.
 * 필터 모드라 allowCreate=false — 기존 태그(availableTags)에서만 고른다(태그 보기에서 새 태그 생성은 무의미).
 * 선택 칩은 TagInput 내부에서 `<TagChip removable>`로 렌더되고, §7f 의 "(AND)" 어포던스를 옆에 둔다.
 *
 * 데이터 휴면(infra 전): RSC page 가 availableTags=[](빈 배열)을 내려주므로
 *  - 고를 추천이 없고(드롭다운 비어 있음),
 *  - 결과는 항상 EmptyState 로 떨어진다(가짜 tagged 항목 금지 — calendar-screen/techniques 패턴).
 * 인프라 연결 시 동일 컴포넌트가 실데이터(사용자 태그 + AND 조회 결과)로 채워진다.
 */
export interface TagsViewProps {
  /** 선택 가능한 사용자 태그(인프라 전 dormant=[]). */
  availableTags: string[];
}

export function TagsView({ availableTags }: TagsViewProps) {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4">
      {/* 선택 AND 바 — 필터 모드(생성 비허용). §7f: 선택 칩 + (AND) 어포던스. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TagInput
              value={selected}
              onChange={setSelected}
              allowCreate={false}
              suggestions={availableTags}
              label="태그 필터"
              placeholder="태그로 필터"
            />
          </div>
        </div>
        {selected.length > 1 && (
          <p className="text-body-xs-400 text-[var(--text-muted)]">
            선택한 태그를 <strong className="font-semibold">모두(AND)</strong> 가진 항목만 모아 봅니다.
          </p>
        )}
      </div>

      {/* 결과 — 그룹(기술/세션) 영역. 휴면이라 실데이터 없음 → EmptyState. */}
      {selected.length === 0 ? (
        <EmptyState
          icon={<SearchIcon width={40} height={40} />}
          title="태그를 선택해 세션·기술을 모아보세요"
          description="여러 태그를 함께 고르면 모두 가진 항목만 AND로 좁혀 봅니다. (데이터 연동 예정)"
        />
      ) : (
        <EmptyState
          icon={<SearchIcon width={40} height={40} />}
          title="선택한 태그에 해당하는 항목이 없습니다"
          description="선택한 태그가 달린 세션·기술이 여기 모입니다. (데이터 연동 예정)"
        />
      )}
    </div>
  );
}
