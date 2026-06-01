'use client';

import { useMemo, useState } from 'react';

import type { Technique } from '@/entities/technique';
import { Button, EmptyState, TechniqueIcon } from '@/shared/ui';

import {
  clearFilters,
  DEFAULT_TECHNIQUE_FILTERS,
  filterAndSortTechniques,
  isAnyFilterActive,
  type TechniqueFilters,
} from '../model/filters';
import { TechniqueCard } from './TechniqueCard';
import { TechniqueFilterBar } from './TechniqueFilterBar';

/**
 * TechniqueLibrary — 라이브러리 클라이언트 아일랜드 (F4-AC2/AC4 / Design §7d).
 *
 * 필터 상태(useState)를 소유하고 TechniqueFilterBar + 결과 그리드를 조합한다.
 * 순수 filterAndSortTechniques 결과를 useMemo 로 메모이즈해 카드 그리드로 렌더.
 *
 * 데이터 휴면(infra 전): RSC page 가 techniques=[](빈 배열)을 내려주므로 결과는 비어
 * EmptyState 로 떨어진다. 필터 활성 여부에 따라 두 가지 빈 상태를 구분한다
 * (가짜 기술 레코드 금지 — 인프라 연결 시 동일 컴포넌트가 실데이터로 채워진다).
 */
export interface TechniqueLibraryProps {
  techniques: Technique[];
}

export function TechniqueLibrary({ techniques }: TechniqueLibraryProps) {
  const [filters, setFilters] = useState<TechniqueFilters>(DEFAULT_TECHNIQUE_FILTERS);

  const visible = useMemo(
    () => filterAndSortTechniques(techniques, filters),
    [techniques, filters],
  );

  const anyActive = isAnyFilterActive(filters);

  const resetFilters = () => setFilters((f) => clearFilters(f));

  return (
    <div className="flex flex-col gap-4">
      <TechniqueFilterBar filters={filters} onChange={setFilters} />

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((t) => (
            <TechniqueCard key={t.id} technique={t} />
          ))}
        </div>
      ) : anyActive ? (
        <EmptyState
          icon={<TechniqueIcon width={40} height={40} />}
          title="필터에 맞는 기술이 없습니다"
          description="필터를 바꾸거나 초기화해 보세요."
          action={
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              필터 초기화
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={<TechniqueIcon width={40} height={40} />}
          title="아직 등록한 기술이 없습니다"
          description="기술을 추가하면 종목·벨트 배지와 함께 카드로 정리됩니다. (라이브러리 연동 예정)"
        />
      )}
    </div>
  );
}
